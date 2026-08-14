import { cp, readFile, writeFile } from "node:fs/promises";
const target = "android/app/src/main/java/com/pablo/cofrinho";
await cp("native-android/com/pablo/cofrinho", target, { recursive: true });
const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = await readFile(manifestPath, "utf8");
manifest = manifest.replace(/<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?<\/activity>/, (activity) => activity);
manifest = manifest.replace("</application>", `    <provider android:name=".CofrinhoBridgeProvider" android:authorities="com.pablo.cofrinho.bridge" android:exported="true" android:grantUriPermissions="false" />\n    </application>`);
await writeFile(manifestPath, manifest);
