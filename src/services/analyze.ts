import Error from '../error/error.ts';
import Lexer from './analyze.type.ts';
import { TLex } from './parse.type.ts';

const analyze = (data: TLex[]): Error[] => {
	const lexer = new Lexer(data);
	lexer.analyze();
	return lexer.errors;
};

export default analyze;
