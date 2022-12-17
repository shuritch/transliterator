import { TLex } from '../services/parse.type.ts';

class Error {
	public error: string;

	constructor(message: string, lex: TLex) {
		const { row, col } = lex.position;
		this.error = this.redBackground(`Error`) + ` ${message}, ${this.position(row, col)}`;
		this.error += `\n\tWhile reading "${lex.lexeme}" of type <${lex.type}>`;
	}

	private position(row: number, col: number): string {
		return `At: (row:${row}, col:${col})`;
	}

	private redBackground(message: string): string {
		return '\x1b[41m' + `${message}:` + '\x1b[0m ';
	}
}

export default Error;
