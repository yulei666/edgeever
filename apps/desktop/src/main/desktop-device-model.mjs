import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const trimModel = (value) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

export const readDesktopDeviceModel = ({
  execFileSync: execFile = execFileSync,
  platform = process.platform,
  readFileSync: readFile = readFileSync,
} = {}) => {
  try {
    if (platform === "darwin") {
      return trimModel(execFile("sysctl", ["-n", "hw.model"], { encoding: "utf8", timeout: 2_000 }));
    }
    if (platform === "win32") {
      return trimModel(execFile("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "(Get-CimInstance -ClassName Win32_ComputerSystem).Model",
      ], {
        encoding: "utf8",
        timeout: 3_000,
        windowsHide: true,
      }));
    }
    if (platform === "linux") {
      return trimModel(readFile("/sys/class/dmi/id/product_name", "utf8"));
    }
  } catch {
    return null;
  }
  return null;
};
