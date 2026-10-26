module.exports = {
  packagerConfig: {
    name: "Rift Runner",
    executableName: "rift-runner",
    appBundleId: "com.riftrunner.game"
  },
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"]
    }
  ]
};