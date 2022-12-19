import Error from '../error/error.ts';
import { TLex } from './parse.type.ts';
import dict from '../../data/dictionary.json' assert { type: 'json' };
import { v4 } from 'https://deno.land/std@0.155.0/uuid/mod.ts';

type TBlocks = {
	blocks: {
		[key: string]: { variables: { [key: string]: string }; parent: string | null };
	};
	current: string | null;
};
class Lexer {
	private i = 0;
	private blocks: TBlocks = {
		blocks: { global: { variables: {}, parent: null } },
		current: null
	};
	public errors: Error[] = [];
	constructor(private data: TLex[]) {}

	private mutator =
		(fn: Function) =>
		(...data: any) => {
			if (this.errors.length) return;
			this.lex_comment();
			const result = fn(...data);
			this.lex_comment();
			return result;
		};

	private initBlock = (name: string, parent: string) => {
		this.blocks.blocks[name] = { parent: parent, variables: {} };
		this.blocks.current = name;
	};

	private push = (message: string, current: TLex) =>
		this.errors.push(new Error(message, current));

	public analyze = this.mutator(() => {
		this.errors = [];

		this.lex_program();
		this.lex_var();
		this.lex_begin();

		this.lex_end();
	});

	// Пропускает объявление программы, вляет на i
	// Проверка объявления программы
	private lex_program = this.mutator(() => {
		const lex = this.data[this.i];

		if (lex?.lexeme !== 'program') return this.push('Missing program initilization', lex);
		if (Object.prototype.hasOwnProperty.call(this.blocks, 'program'))
			return this.push('Double program initilization', lex);

		this.i++;
		this.initBlock('program', 'global');
	});

	// Пропускает все найденные var, влияет на i
	// Проверка объявления переменных и их типов данных
	private lex_var = this.mutator(() => {
		const lex = this.data[this.i];

		const skipType = this.mutator(() => {
			const lex = this.data[this.i];
			this.i++;
			if (dict['data types'].indexOf(lex?.lexeme) === -1)
				return this.push('Unknown data type', lex);
		});

		const nextVariable = this.mutator((type: string) => {
			const lex = this.data[this.i];
			const isVar = this.isName();
			this.i++;
			if (!isVar) return this.push('Missing variable name or name is incorrect', lex);
			if (lex?.type !== 'wtf') return this.push('Variable declared by system', lex);
			if (!this.blocks.current)
				return this.push('Variables declaration on global state', lex);
			if (this.blocks.blocks[this.blocks.current].variables[lex?.lexeme])
				return this.push('Already declared at state block', lex);

			this.blocks.blocks[this.blocks.current].variables[lex?.lexeme] = type;
		});

		const run = this.mutator(() => {
			const type = this.data[this.i]?.lexeme;
			skipType();
			nextVariable(type);
			while (this.data[this.i]?.type === 'comma') {
				this.i++;
				nextVariable(type);
			}
			this.lex_var();
		});

		if (lex?.lexeme === 'var') {
			this.i++;
			run();
		}
	});

	// Пропускает begin, операторы и комментарии, влияет на i
	// Проверка объявления begin
	private lex_begin = this.mutator(() => {
		const lex = this.data[this.i];
		if (lex?.lexeme !== 'begin')
			return this.errors.push(new Error('Unexpected name, awaited: begin', lex));

		this.initBlock('begin', 'program');
		this.lex_comment();

		do {
			this.i++;
			this.lex_operator('begin');
			this.blocks.current = 'begin';
			this.i--;
			this.lex_comment_reverse();
		} while (this.data[this.i]?.type === 'semicolon');
		this.i++;
		this.blocks.current = 'program';
	});

	// Пропускает end и комментарии, влияет на i
	// Проверка объявления end
	private lex_end = this.mutator(() => {
		const lex = this.data[this.i];
		if (!lex) return;
		this.i++;
		if (lex?.lexeme !== 'end')
			return this.errors.push(new Error('Unexpected name, awaited: end', lex));
		this.lex_comment();

		if (this.i <= this.data.length - 1)
			return this.push('Unexpected expressions, after program end', this.data[this.i]);
	});

	// Пропускает вырадение, влияет на i
	private lex_comare = this.mutator(() => {
		let lex = this.data[this.i];
		if (lex?.type === 'unary') {
			this.i++;
			lex = this.data[this.i];
		}

		const value = this.isValue('float') || this.isValue('bool') || this.isValue('int');
		if (!value && !this.isVariable())
			return this.push('Unexpected word, awaited: variable or value', lex);

		this.i++;
		this.lex_comment();
		lex = this.data[this.i];

		if (lex?.type !== 'relations' && lex?.lexeme !== '&&' && lex?.lexeme !== '||') return;
		this.i++;

		this.lex_comare();
	});

	// Не влияет на i
	// Проверка допустимосьти переменной
	private isName = this.mutator((): boolean => {
		const lex = this.data[this.i];
		const regexp = new RegExp(/^[a-zA-ZА-Яа-яЁё]+/);
		if (!regexp.test(lex?.lexeme)) return false;
		return true;
	});

	// Не влияет на i
	// Проверка допустимосьти значения
	private isValue = this.mutator((type: string): boolean => {
		const lex = this.data[this.i];
		let regexp: RegExp;
		if (type === 'int') regexp = new RegExp(/^[0-9]+$/);
		else if (type === 'bool') regexp = new RegExp(/true|false/);
		else if (type === 'float') regexp = new RegExp(/^[0-9]+\.[0-9]/);
		else return false;

		return regexp.test(lex?.lexeme);
	});

	// Не влияет на i
	// Проверка существования переменной
	private isVariable = this.mutator((variable: string): null | string => {
		const lex = this.data[this.i];
		const isVar = this.isName();

		if (!isVar) {
			this.push('Incorrect variable name', lex);
			return null;
		}

		let current = this.blocks.current;

		if (!current) {
			this.push('Unexpected word', lex);
			return null;
		}

		let block = this.blocks.blocks[current];
		let type = block.variables[lex?.lexeme];

		while (!type && current) {
			if (!current) {
				this.push('Underfined variable intitilization', lex);
				return null;
			}

			block = this.blocks.blocks[current];
			type = block.variables[lex?.lexeme];
			current = block.parent;
		}

		return type;
	});

	private lex_set = this.mutator(() => {
		const fn = this.mutator(() => {
			const lex = this.data[this.i];
			this.i++;

			if (lex?.type !== 'appropriation')
				return this.push('Unexpected, awaited appropriation: as', lex);
		});
		const type = this.isVariable();
		this.i++;
		if (!type) return this.push('Unexpected word', this.data[this.i - 1]);

		fn();
		this.lex_expression();
	});

	// Влияет на i, если оператор
	// Проходим оператор и вложенные операторы, если сложный

	private lex_operator = this.mutator((curr: string, conditional = false) => {
		this.lex_var();
		const lex = this.data[this.i];
		if (!lex) return;
		// console.log(curr);

		// Сложный оператор
		if (lex?.type === 'compound') {
			// Входим в сложный оператор
			if (lex?.lexeme === '[') {
				const block = v4.generate();

				// console.log(curr + ' ==> ' + block, lex);
				this.initBlock(block, curr);
				this.i++;
				this.lex_operator(block, conditional);
			}
			// Неожиданный выход сложного оператора
			else if (lex?.lexeme === ']' && (curr === 'begin' || curr === 'program'))
				return this.push('Unexpected compound end', lex);
			// Выходим из сложного оператора
			else if (this.blocks.current) {
				// console.log(this.blocks.blocks[curr].parent + ' <== ' + curr, lex);
				this.blocks.current = this.blocks.blocks[curr].parent;
				curr = <string>this.blocks.blocks[curr].parent;
			}
		}

		// while
		else if (lex?.type === 'conditional cycle') {
			this.i++;
			this.lex_comare();
			this.lex_comment();
			if (this.data[this.i]?.type !== 'cycle do')
				return this.push('Awaited key word: do', this.data[this.i]);
			this.i++;
			this.lex_operator(curr, conditional);
		}

		// for
		else if (lex?.type === 'cycle') {
			this.i++;
			this.lex_set();
			if (this.data[this.i]?.lexeme !== 'to')
				return this.push('Awaited key word: to', this.data[this.i]);
			this.i++;
			this.lex_comare();
			if (this.data[this.i]?.lexeme !== 'do')
				return this.push('Awaited key word: do', this.data[this.i]);
			this.i++;
			this.lex_operator(curr, conditional);
		}

		//read, write
		else if (lex?.type === 'read' || lex?.type === 'write') {
			this.i++;
			this.lex_comment();
			if (this.data[this.i]?.lexeme !== '(')
				return this.push('Unexpected word, awaited: (', this.data[this.i]);
			this.i++;
			this.lex_comment();
			if (lex?.type === 'read') {
				let type = this.isVariable();
				this.i++;
				this.lex_comment();
				while (type && this.data[this.i]?.lexeme === ',') {
					this.i++;
					this.lex_comment();
					type = this.isVariable();
					this.i++;
					this.lex_comment();
				}
			} else {
				this.lex_comare();
				while (this.data[this.i]?.lexeme === ',') this.lex_comare();
			}
			this.lex_comment();
			if (this.data[this.i]?.lexeme !== ')')
				return this.push('Unexpected word, awaited: )', this.data[this.i]);
		}

		// Присваивание
		else if (lex?.type === 'wtf') {
			this.lex_set();
			this.i--;
		}
		// if else
		else if (lex?.type === 'conditional') {
			if (lex?.lexeme === 'if') {
				this.i++;
				this.lex_comare();

				if (this.data[this.i]?.lexeme !== 'then' && !this.errors.length)
					return this.push('Awaited: then', lex);
				this.i++;
				this.lex_operator(curr, true);
				this.lex_comment();
				conditional = false;
				if (this.data[this.i]?.lexeme === 'else') {
					this.i++;
					this.lex_operator(curr);
				}
			} else if (!conditional) return this.push('Unexpected conditional statement', lex);
		}
		// else
		else {
			return this.push('Unexpected word', lex);
		}

		if (this.blocks.current !== 'begin' && this.blocks.current !== 'program') {
			this.i++;
			this.lex_operator(curr, conditional);
			// console.log(this.data[this.i], this.i);
		} else {
			if (curr === 'begin') this.i++;
			return;
		}
	});

	// Влияет на i, если выражение
	// Пропускаем выражение
	private lex_expression = this.mutator(() => {
		let lex = this.data[this.i];
		if (lex?.type === 'unary') {
			this.i++;
			lex = this.data[this.i];
		}

		const value = this.isValue('float') || this.isValue('bool') || this.isValue('int');
		if (!value && !this.isVariable())
			return this.push('Unexpected word, awaited: variable or value', lex);

		this.i++;
		this.lex_comment();
		lex = this.data[this.i];

		if (lex?.type !== 'addition' && lex?.type !== 'multiplication') return;
		this.i++;

		this.lex_expression();
	});

	// Пропускаем комментарии, влияет на i, если нашли комментарии
	private lex_comment = () => {
		if (this.errors.length) return;
		const lex = this.data[this.i];

		if (lex?.type !== 'comments') return;

		if (lex?.lexeme === '}') return this.push('Missing comments opening', lex);

		let flag = false;
		while (this.i <= this.data.length - 1) {
			const lex = this.data[this.i];
			if (lex?.lexeme === '}') {
				flag = true;
				this.i++;
				break;
			}
			this.i++;
		}
		if (!flag) this.push('Missing comments closing', lex);
		if (this.data[this.i]?.lexeme === '{') this.lex_comment();
	};

	private lex_comment_reverse = () => {
		if (this.errors.length) return;
		const lex = this.data[this.i];

		if (lex?.type !== 'comments') return;

		if (lex?.lexeme === '{') return;

		while (this.i > 0) {
			const lex = this.data[this.i];
			if (lex?.lexeme === '{') {
				this.i--;
				break;
			}
			this.i--;
		}
		if (this.data[this.i]?.lexeme === '}') this.lex_comment_reverse();
	};
}

export default Lexer;
