# Chrome Web Store listing

## Product details

- Name: `EdgeEver Web Clipper`
- Primary language: `中文（简体）`
- Category: `Workflow & Planning`
- Homepage: `https://edgeever.org/`
- Support URL: `https://github.com/tianma-if/edgeever/issues`
- Privacy policy: `https://edgeever.org/privacy`

## Localized listings

- `中文（简体）`: Primary language
- `English`: Localized listing

Select the matching language in the Chrome Web Store developer dashboard and enter the corresponding copy below. Store listing localization is separate from the extension's packaged `_locales` messages.

## Upload files

- Package: `store-assets/edgeever-web-clipper-v0.1.8.zip`
- Store icon: `public/icons/icon-128.png`
- Screenshot: `store-assets/screenshot-options-1280x800.jpg`
- Small promo tile: `store-assets/promo-small-440x280.jpg`

### 中文（简体）

#### Summary

将当前网页、选中文字、右键图片、X 推文、小红书笔记、知乎回答或文章，或 GitHub 仓库保存到你自托管的 EdgeEver 实例。

#### Detailed description

EdgeEver Web Clipper 可以把当前网页、选中的文字、右键选中的图片、X 上的一条推文、小红书上的一篇笔记、知乎上的一篇回答或文章，或 GitHub 仓库的地址和简介保存到自托管的 EdgeEver 实例。

主要功能：

- 自动提取文章正文，并转换为便于搜索和编辑的 Markdown。
- 选中一段文字后右键，选择“保存选中文字到 EdgeEver”，只保存这段文字。
- 在图片上右键，选择“保存图片到 EdgeEver”，把图片文件存成一条新笔记。
- 在 X 上右键推文正文，选择“保存这条推文到 EdgeEver”。长文会先展开“显示更多”，再保存全文和已经显示的图片。
- 在小红书笔记正文上右键，选择“保存这篇小红书笔记到 EdgeEver”。标题、正文和图片会存成一条笔记，评论不会写入。
- 在知乎回答或文章正文上右键，选择“保存这篇知乎回答或文章到 EdgeEver”。标题、作者、正文和图片会存成一条笔记，评论不会写入。首页和问题页保存的是指针下的那一篇。
- 在 GitHub 仓库主页或代码目录上，右键页面空白、简介或 README 正文，选择“保存这个仓库到 EdgeEver”。笔记保留仓库地址和简介；页面上有主页、语言、许可证和话题时一并写入。
- 这几项命令直接出现在右键菜单的第一级。
- 在笔记中保留来源和剪藏时间。从 Google 搜索保存的图片记录“Google 搜索”和关键词。
- 可选择默认笔记本，并自动添加 `web-clip` 标签。
- 网页内容直接发送到你配置的 EdgeEver 实例，不经过开发者的中转服务器。

使用前，请在插件设置中填写 EdgeEver 实例地址和 API Token。插件只会在你点击“剪藏当前网页”，或选择“保存选中文字到 EdgeEver”“保存图片到 EdgeEver”“保存这条推文到 EdgeEver”“保存这篇小红书笔记到 EdgeEver”“保存这篇知乎回答或文章到 EdgeEver”“保存这个仓库到 EdgeEver”后读取当前标签页。图片若无法由页面直接交出，才会再向你请求该图片所在网站的访问权限。

EdgeEver 是开源、自托管的现代笔记工作区。项目主页与源代码：https://github.com/tianma-if/edgeever

### English

#### Summary

Save a webpage, selected text, a right-clicked image, an X post, a Xiaohongshu note, a Zhihu answer or article, or a GitHub repository to your self-hosted EdgeEver.

#### Detailed description

EdgeEver Web Clipper saves the current webpage, selected text, a right-clicked image, an X post, a Xiaohongshu note, a Zhihu answer or article, or a GitHub repository's address and description to your self-hosted EdgeEver instance.

Key features:

- Extract article content automatically and convert it to searchable, editable Markdown.
- Select text, right-click, and choose “Save selection to EdgeEver” to store that passage only.
- Right-click an image and choose “Save image to EdgeEver” to store the image file as a new note.
- On X, right-click the post text and choose “Save this post to EdgeEver”. Long posts are expanded before saving, so the full text and already shown photos go into one note.
- On Xiaohongshu, right-click the note text and choose “Save this Xiaohongshu note to EdgeEver”. The title, text, and photos go into one note. Comments are left out.
- On Zhihu, right-click the answer or article text and choose “Save this Zhihu answer or article to EdgeEver”. The title, author, text, and photos go into one note. Comments are left out. On the home feed or a question page, the item under the pointer is saved.
- On a GitHub repository page or code tree, right-click the page background, the description, or the README text and choose “Save this repository to EdgeEver”. The note keeps the address and description, plus the homepage, language, license, and topics when the page shows them.
- These commands stay on the top-level right-click menu.
- Preserve the source and clipping time in the note. An image saved from Google Search records “Google Search” and the keyword.
- Select a default notebook and add the `web-clip` tag automatically.
- Send webpage content directly to your configured EdgeEver instance without a developer-operated relay server.

Before using the extension, enter your EdgeEver instance URL and API token in the extension settings. The extension reads the current tab only after you click “Clip current page” or choose “Save selection to EdgeEver”, “Save image to EdgeEver”, “Save this post to EdgeEver”, “Save this Xiaohongshu note to EdgeEver”, “Save this Zhihu answer or article to EdgeEver”, or “Save this repository to EdgeEver”. It asks for access to an image's site only when that page cannot provide the image file.

EdgeEver is an open-source, self-hosted modern notes workspace. Project homepage and source code: https://github.com/tianma-if/edgeever

## Privacy practices

### Single purpose

Save the current webpage, user-selected text, a user-chosen image, one X post, one Xiaohongshu note, one Zhihu answer or article, or one GitHub repository card to the self-hosted EdgeEver instance explicitly configured by the user.

### Permission justifications

- `activeTab`: Read the active page only after the user clicks the extension's save action or chooses Save selection to EdgeEver, Save image to EdgeEver, Save this post to EdgeEver, Save this Xiaohongshu note to EdgeEver, Save this Zhihu answer or article to EdgeEver, or Save this repository to EdgeEver.
- `contextMenus`: Add one top-level item for the thing the user right-clicked: selected text, an image, an X post, a Xiaohongshu note, a Zhihu answer or article, or a GitHub repository page. It runs only after the user selects that item.
- `scripting`: Inject the packaged capture script into the active page after the user initiates a capture.
- `storage`: Store the user's EdgeEver instance URL, API token, and default notebook ID locally.
- Optional host permissions: Send API requests only to the EdgeEver instance origin the user approves. If a page cannot provide an image file, the extension can also ask for access to that image's site, or to all sites when the user explicitly chooses that option, and uses it only to download the image the user chose to save. Saving a post from an X timeline asks for access to X so the extension can remember which post was under the pointer. The script on X only records that target and runs after the user allows it. Saving a note from a Xiaohongshu feed asks for access to Xiaohongshu for the same reason. An open note page can be saved without that extra permission. On Zhihu, a content script remembers which answer or article was under the pointer. It does not send the page anywhere. The full text is read only after the user chooses Save this Zhihu answer or article to EdgeEver, and it is sent only to the user's EdgeEver instance. If that listener is missing, the extension asks once for access to Zhihu and then asks the user to right-click the same text again.

### Data disclosures

The extension handles authentication information, website content, and web browsing activity. These data are used only for the user-triggered clipping feature. Page content is processed locally and sent directly to the user's configured EdgeEver instance. The developer does not receive or retain it.

- Data is not sold or transferred to third parties outside the approved use case.
- Data is not used for purposes unrelated to the extension's single purpose.
- Data is not used for creditworthiness or lending.
- No remote code is used.

## Distribution

- Visibility: Public
- Regions: All regions supported by the Chrome Web Store
- Defer publish: Off, unless a manual launch date is desired
