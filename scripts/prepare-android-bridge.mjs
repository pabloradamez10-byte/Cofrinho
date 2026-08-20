import { cp, readFile, writeFile } from "node:fs/promises";
const target = "android/app/src/main/java/com/pablo/cofrinho";
await cp("native-android/com/pablo/cofrinho", target, { recursive: true });

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = await readFile(manifestPath, "utf8");
if (!manifest.includes("com.pablo.cofrinho.bridge")) {
  manifest = manifest.replace("</application>", `    <provider android:name=".CofrinhoBridgeProvider" android:authorities="com.pablo.cofrinho.bridge" android:exported="true" android:grantUriPermissions="false" />\n    </application>`);
}
await writeFile(manifestPath, manifest);

const gradlePath = "android/app/build.gradle";
let gradle = await readFile(gradlePath, "utf8");
gradle = gradle.replace(/versionCode\s+\d+/, "versionCode 130");
gradle = gradle.replace(/versionName\s+"[^"]+"/, 'versionName "1.3.0"');
await writeFile(gradlePath, gradle);
