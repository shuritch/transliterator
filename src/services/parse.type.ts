export class TLex {
	public lexeme: string;

	public type: string;

	public position: {
		row: number;
		col: number;
	};

	constructor(lexeme: string, type: string, x: number, y: number) {
		this.lexeme = lexeme;
		this.type = type;
		this.position = { row: y, col: x };
	}
}
