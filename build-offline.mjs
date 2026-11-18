import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const read = name => readFileSync(new URL('./dist/' + name, import.meta.url), 'utf8');
const inlineScript = text => text.replace(/<\/script/gi, '<\\/script');
let html = read('index.html')
  .replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, name) => '<style>\n' + read(name) + '\n</style>')
  .replace(/<script src="([^"]+)"><\/script>/g, (_, name) => '<script>\n' + inlineScript(read(name)) + '\n</script>');
const originalLicense = readFileSync(new URL('./LICENSE', import.meta.url), 'utf8');
const notices = [originalLicense, ...['vendor/LICENSE','fonts/NOTICE.txt','fonts/LICENSE-NotoSansSC.txt','fonts/LICENSE-NotoSerifSC.txt'].map(read)].join('\n\n');
html = html.replace('</body>', () => '<script type="text/plain" id="asset-licenses">' + inlineScript(notices) + '</script>\n</body>');
const output = fileURLToPath(new URL('./wish-capsule.html', import.meta.url));
writeFileSync(output, html);
console.log(output);
