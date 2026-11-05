// Fork-only CI UI tests for #652 PR A (truncation protection in the AI note assistant).
// They drive the real app against scripts/ci/ios-ui-backend.mjs (self-hosted server + mock
// provider on 127.0.0.1). Never merged upstream.
import XCTest

final class AiAssistantIncompleteUITests: XCTestCase {
    private let instanceURL = "http://127.0.0.1:18795"
    private let username = "admin"
    private let password = "ui-test-652-local-only"
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
        try signInIfNeeded()
    }

    func testCompleteResultCanReplace() throws {
        try generate(in: "UI complete")
        waitForGenerationEnd()
        snapshot("complete")
        XCTAssertTrue(replaceButton.isEnabled, "a complete result must be allowed to replace the note")
        XCTAssertFalse(text(containing: "incomplete").exists)
        XCTAssertFalse(text(containing: "Generation was stopped").exists)
    }

    func testLengthFinishBlocksReplace() throws {
        try generate(in: "UI length")
        waitForGenerationEnd()
        snapshot("length")
        XCTAssertTrue(text(containing: "This result is incomplete").waitForExistence(timeout: 5))
        XCTAssertFalse(replaceButton.isEnabled, "a result cut at the output limit must not replace the note")
        XCTAssertTrue(appendButton.isEnabled, "append stays available for an incomplete result")
    }

    func testMissingEndMarkerBlocksReplace() throws {
        try generate(in: "UI unterminated")
        waitForGenerationEnd()
        snapshot("unterminated")
        XCTAssertTrue(text(containing: "This result is incomplete").waitForExistence(timeout: 5))
        XCTAssertFalse(replaceButton.isEnabled, "a result without its end marker must not replace the note")
    }

    func testStoppedResultBlocksReplaceUntilRegenerated() throws {
        try generate(in: "UI stop")
        XCTAssertTrue(text(containing: "Streaming paragraph 2").waitForExistence(timeout: 30), "streamed text should appear")
        let stop = app.buttons["Stop"]
        XCTAssertTrue(stop.exists)
        stop.tap()
        waitForGenerationEnd()
        snapshot("stopped")
        XCTAssertTrue(text(containing: "Generation was stopped").waitForExistence(timeout: 5))
        XCTAssertFalse(replaceButton.isEnabled, "a stopped result must not replace the note")
        XCTAssertTrue(appendButton.isEnabled, "append stays available for a stopped result")
    }

    func testDroppedConnectionAfterPartialTextBlocksReplace() throws {
        try generate(in: "UI drop")
        waitForGenerationEnd()
        snapshot("dropped")
        XCTAssertTrue(text(containing: "Received paragraph one").exists, "the text received before the drop stays as the draft")
        XCTAssertTrue(text(containing: "generation was interrupted").waitForExistence(timeout: 5))
        XCTAssertFalse(replaceButton.isEnabled, "a result cut by a dropped connection must not replace the note")
        XCTAssertTrue(appendButton.isEnabled, "append stays available for an interrupted result")
    }

    func testUnmarkedFragmentClosedWithoutFinishBlocksReplace() throws {
        try generate(in: "UI cut")
        waitForGenerationEnd()
        snapshot("cut")
        XCTAssertTrue(text(containing: "Fragment paragraph one").exists, "the fragment stays as the draft")
        XCTAssertTrue(text(containing: "generation was interrupted").waitForExistence(timeout: 5))
        XCTAssertFalse(replaceButton.isEnabled, "a fragment without markers or a finish reason must not replace the note")
        XCTAssertTrue(appendButton.isEnabled, "append stays available for an interrupted result")
    }

    func testCutOffResultIsContinuedAndCanReplace() throws {
        try generate(in: "UI continue")
        waitForGenerationEnd()
        snapshot("continued")
        XCTAssertTrue(text(containing: "Continued paragraph three").waitForExistence(timeout: 5), "the continuation is appended")
        XCTAssertTrue(text(containing: "First paragraph one").exists)
        XCTAssertFalse(text(containing: "incomplete").exists)
        XCTAssertTrue(replaceButton.isEnabled, "a result completed by a continuation can replace the note")
    }

    // MARK: - Flow

    private func signInIfNeeded() throws {
        // A relaunch can restore the previous note's detail page, which has its own text field,
        // so the login form is recognised by its Sign in button rather than by any text field.
        let fields = app.textFields
        let signIn = app.buttons["Sign in"].firstMatch
        let notesReady = noteText("UI complete")
        let back = app.buttons["Back to list"].firstMatch
        let deadline = Date().addingTimeInterval(30)
        while Date() < deadline {
            if notesReady.exists || back.exists { return }
            if signIn.exists { break }
            _ = signIn.waitForExistence(timeout: 1)
        }
        guard signIn.exists else {
            snapshot("no-login-form")
            XCTFail("neither the notes list, a note page nor the login form appeared")
            return
        }
        snapshot("login")
        replaceText(in: fields.element(boundBy: 0), with: instanceURL)
        replaceText(in: fields.element(boundBy: 1), with: username)
        let secure = app.secureTextFields.firstMatch
        secure.tap()
        secure.typeText(password)
        signIn.tap()
        let proceed = app.alerts.buttons["Continue"]
        if proceed.waitForExistence(timeout: 5) { proceed.tap() }
        if !notesReady.waitForExistence(timeout: 90) {
            snapshot("after-login")
            XCTFail("the seeded notes did not appear after signing in")
        }
    }

    private func generate(in title: String) throws {
        let back = app.buttons["Back to list"].firstMatch
        if back.waitForExistence(timeout: 3) { back.tap() }
        let note = noteText(title)
        XCTAssertTrue(note.waitForExistence(timeout: 30), "note \(title) should be listed")
        note.tap()
        let more = app.buttons["Note actions"].firstMatch
        XCTAssertTrue(more.waitForExistence(timeout: 30), "note detail should open")
        more.tap()
        let assistant = app.buttons["AI note assistant"]
        XCTAssertTrue(assistant.waitForExistence(timeout: 10))
        assistant.tap()
        let instruction = app.descendants(matching: .any)
            .matching(NSPredicate(format: "placeholderValue BEGINSWITH %@", "For example"))
            .firstMatch
        XCTAssertTrue(instruction.waitForExistence(timeout: 15), "custom instruction field should show")
        instruction.tap()
        instruction.typeText("Polish this note")
        let generate = app.buttons["Generate"]
        XCTAssertTrue(generate.waitForExistence(timeout: 5))
        if app.keyboards.count > 0 { app.swipeDown(velocity: .slow) }
        generate.tap()
    }

    private func waitForGenerationEnd() {
        let regenerate = app.buttons["Regenerate"]
        if !regenerate.waitForExistence(timeout: 60) {
            snapshot("generation-not-finished")
            XCTFail("generation did not finish")
        }
    }

    // MARK: - Helpers

    private var replaceButton: XCUIElement { app.buttons["Replace"].firstMatch }
    private var appendButton: XCUIElement { app.buttons["Append"].firstMatch }

    private func noteText(_ title: String) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
    }

    private func text(containing value: String) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", value)).firstMatch
    }

    private func replaceText(in field: XCUIElement, with value: String) {
        field.tap()
        if let current = field.value as? String, !current.isEmpty, current != field.placeholderValue {
            field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count))
        }
        field.typeText(value)
    }

    private func snapshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
