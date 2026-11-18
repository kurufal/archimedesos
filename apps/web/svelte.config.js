import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const pages = 'build';
const staticAdapter = adapter({pages});
const manifest = path => JSON.parse(readFileSync(join(path,'package.json'),'utf8'));

function collectNotices() {
	const notices = new Map();
	function collect(name, from, browserDependencies) {
		let path;
		for (let directory = from; !path; directory = dirname(directory)) {
			const candidate = join(directory,'node_modules',name);
			if (existsSync(join(candidate,'package.json'))) path = candidate;
			else if (dirname(directory) === directory) throw new Error(`Missing notice dependency: ${name}`);
		}
		const pkg = manifest(path);
		const label = `${pkg.name} ${pkg.version}`;
		if (notices.has(label)) return;
		const files = readdirSync(path,{withFileTypes:true}).filter(file => file.isFile() && /^(?:licen[cs]e|copying|notice|copyright|ofl)(?:$|[.-])/i.test(file.name));
		if (!files.length) throw new Error(`Missing upstream license text: ${label}`);
		notices.set(label, `${label} (${pkg.license ?? 'see upstream text'})\n` + files.map(file => `${file.name}\n${readFileSync(join(path,file.name),'utf8')}`).join('\n'));
		for (const dependency of browserDependencies ?? Object.keys(pkg.dependencies ?? {})) collect(dependency,path);
	}
	for (const name of Object.keys(manifest(root).dependencies)) collect(name,root);
	collect('svelte',root,['clsx','esm-env']);
	collect('@sveltejs/kit',root,['devalue','esm-env']);
	return 'ArchimedesOS web prototype: third-party package notices\n\n' + [...notices.keys()].sort().map(key => notices.get(key)).join('\n\n');
}

export default { preprocess: vitePreprocess(), kit: { adapter: {
	...staticAdapter,
	async adapt(builder) {
		const notices = collectNotices();
		await staticAdapter.adapt(builder);
		for (const name of ['LICENSE','NOTICE']) writeFileSync(join(root,pages,name),readFileSync(join(root,'..','..',name)));
		writeFileSync(join(root,pages,'THIRD-PARTY-NOTICES.txt'),notices);
	},
} } };
