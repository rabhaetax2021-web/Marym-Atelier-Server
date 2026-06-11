const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return null;
  }
}

(function main(){
  const dist = path.resolve(__dirname, '..', 'dist');
  if (!fs.existsSync(dist)) {
    console.error('dist directory not found. Run build first.');
    process.exit(1);
  }

  const commit = getGitSha();
  const timestamp = new Date().toISOString();
  const version = commit ? `${commit}-${timestamp}` : timestamp;

  const versionData = { version, commit: commit || null, timestamp };
  fs.writeFileSync(path.join(dist, 'version.json'), JSON.stringify(versionData, null, 2), 'utf8');

  // env.js exposes a global variable used by the client app
  const envJs = `window.__APP_VERSION__ = ${JSON.stringify(version)};`;
  fs.writeFileSync(path.join(dist, 'env.js'), envJs, 'utf8');

  console.log('Wrote dist/version.json and dist/env.js with version:', version);
})();
