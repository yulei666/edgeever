import { describe, expect, test } from "bun:test";
import { readDesktopDeviceModel } from "./desktop-device-model.mjs";

describe("desktop device model", () => {
  test("reads the macOS hardware model identifier", () => {
    expect(readDesktopDeviceModel({
      execFileSync: (command, args) => {
        expect(command).toBe("sysctl");
        expect(args).toEqual(["-n", "hw.model"]);
        return "Mac16,7\n";
      },
      platform: "darwin",
    })).toBe("Mac16,7");
  });

  test("reads the Windows computer-system model", () => {
    expect(readDesktopDeviceModel({
      execFileSync: (command, args) => {
        expect(command).toBe("powershell.exe");
        expect(args.at(-1)).toContain("Win32_ComputerSystem");
        return "Surface Laptop 5\r\n";
      },
      platform: "win32",
    })).toBe("Surface Laptop 5");
  });

  test("reads the Linux DMI product name", () => {
    expect(readDesktopDeviceModel({
      platform: "linux",
      readFileSync: (path) => {
        expect(path).toBe("/sys/class/dmi/id/product_name");
        return "ThinkPad X1 Carbon Gen 11\n";
      },
    })).toBe("ThinkPad X1 Carbon Gen 11");
  });

  test("returns null when the platform probe fails", () => {
    expect(readDesktopDeviceModel({
      execFileSync: () => {
        throw new Error("sysctl unavailable");
      },
      platform: "darwin",
    })).toBeNull();
  });
});
