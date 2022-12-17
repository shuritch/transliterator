import Error from '../error/error.ts';
import { TLex } from './parse.type.ts';
import dict from '../../data/dictionary.json' assert { type: 'json' };

type TBlocks = { blocks: { [key: string]: string[] }; current: string | null };

class Lexer {
	private i = 0;
	private blocks: TBlocks = { blocks: { global: [] }, current: null };
	public errors: Error[] = [];
	constructor(private data: TLex[]) {}

	public analyze = (): void => {
		this.errors = [];
		this.lex_comment();
		this.lex_program();
		this.lex_var();
		this.lex_begin();
		this.lex_end();
	};

	private push = (message: string, current: TLex) =>
		this.errors.push(new Error(message, current));

	// Пропускает объявление программы, вляет на i
	// Проверка объявления программы
	private lex_program = () => {
		if (this.errors.length) return;
		const lex = this.data[this.i];
		if (lex.lexeme !== 'program') return this.push('Missing program initilization', lex);
		if (Object.prototype.hasOwnProperty.call(this.blocks, 'program'))
			return this.push('Double program initilization', lex);
		this.i++;
		this.blocks.blocks['program'] = [];
		this.blocks.current = 'program';
		this.lex_comment();
	};

	// Пропускает все найденные var, влияет на i
	// Проверка объявления переменных и их типов данных
	private lex_var = () => {
		if (this.errors.length) return;
		const lex = this.data[this.i];

		if (lex.lexeme === 'var') {
			this.i++;
			this.lex_type();
			this.lex_variable_comma();
			while (this.data[this.i].type === 'comma') {
				this.i++;
				this.lex_variable_comma();
			}
			this.lex_var();
		}

		this.lex_comment();
	};

	// Пропускает все найденные переменные и комментарии, влияет на i
	// Проверка объявления переменных
	private lex_variable_comma = () => {
		this.lex_variable();
		this.lex_comment();
	};

	private lex_begin = () => {
		if (this.errors.length) return;
		this.lex_comment();
	};
	private lex_end = () => {
		if (this.errors.length) return;
		this.lex_comment();
	};

	private lex_comare = () => {
		if (this.errors.length) return;
		this.lex_comment();
	};

	// Пропускавет слово после проверки, влияет на i
	// Проверка переменной и её блочной видимосьти
	private lex_variable = () => {
		const lex = this.data[this.i];
		const isVar = this.lex_name();
		if (!isVar) return this.push('Missing variable name or name is incorrect', lex);
		if (lex.type !== 'wtf') return this.push('Variable declared by system', lex);
		if (!this.blocks.current) return this.push('Variables declaration on global state', lex);
		if (this.blocks.blocks[this.blocks.current].indexOf(lex.lexeme) !== -1)
			return this.push('Already declared at state block', lex);
		this.blocks.blocks[this.blocks.current].push(lex.lexeme);
	};

	// Пропускавет слово после проверки, влияет на i
	// Проверка допустимосьти переменной
	private lex_name = (): boolean => {
		const lex = this.data[this.i];
		this.i++;
		const regexp = new RegExp(/[a-zA-ZА-Яа-яЁё]/);
		if (!regexp.test(lex.lexeme)) return false;
		return true;
	};

	// Пропускавет слово после проверки, влияет на i
	// Проверка типа данных
	private lex_type = () => {
		if (this.errors.length) return;
		const lex = this.data[this.i];
		this.i++;
		if (dict['data types'].indexOf(lex.lexeme) === -1)
			return this.push('Unknown data type', lex);
		this.lex_comment();
	};

	private lex_value = () => {
		if (this.errors.length) return;
		this.lex_comment();
	};
	private lex_operator = () => {
		if (this.errors.length) return;
		this.lex_comment();
	};
	private lex_callF = () => {
		if (this.errors.length) return;
		this.lex_comment();
	};

	// Пропускаем комментарии, влияет на i, если нашли комментарии
	private lex_comment = () => {
		if (this.errors.length) return;
		const lex = this.data[this.i];
		if (lex.type !== 'comments') return;
		if (lex.lexeme === '}') return this.push('Missing comments opening', lex);

		let flag = false;
		while (this.i <= this.data.length - 1) {
			const lex = this.data[this.i];
			if (lex.lexeme === '}') {
				flag = true;
				this.i++;
				break;
			}
			this.i++;
		}
		if (!flag) this.push('Missing comments closing', lex);
	};
}

export default Lexer;
