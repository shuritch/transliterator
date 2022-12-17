import { join, dirname, fromFileUrl } from 'https://deno.land/std/path/mod.ts';
import analyze from './src/services/analyze.ts';
import parse from './src/services/parse.ts';

const bootstrap = async () => {
	const __dirname = dirname(fromFileUrl(import.meta.url));
	const dataTxt = await Deno.readTextFile(join(__dirname, 'data', 'example.txt'));
	const data = parse(dataTxt);
	// console.table(data);
	const errors = analyze(data);
	if (errors.length) for (const err of errors) console.log(err.error);
	else console.log('\x1b[47m' + ' Success run ' + '\x1b[0m');
};

bootstrap();
