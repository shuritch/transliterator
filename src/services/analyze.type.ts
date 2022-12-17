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

		if (lex.lexeme !== 'program') return this.push('Missing program initilization', lex);
		if (Object.prototype.hasOwnProperty.call(this.blocks, 'program'))
			return this.push('Double program initilization', lex);

		this.i++;
		this.initBlock('program', 'global');
	});

	// Пропускает все найденные var, влияет на i
	// Проверка объявления переменных и их типов данных
	private lex_var = this.mutator(() => {
		const lex = this.data[this.i];

		const run = this.mutator(() => {
			const type = this.data[this.i].lexeme;
			this.lex_type();
			const nextVariable = this.mutator(this.lex_variable);
			nextVariable(type);

			while (this.data[this.i].type === 'comma') {
				this.i++;
				nextVariable(type);
			}
			this.lex_var();
		});

		if (lex.lexeme === 'var') {
			this.i++;
			run();
		}
	});

	// Пропускает begin, операторы и комментарии, влияет на i
	// Проверка объявления begin
	private lex_begin = this.mutator(() => {
		const lex = this.data[this.i];
		if (lex.lexeme !== 'begin')
			return this.errors.push(new Error('Unexpected name, awaited: begin', lex));

		this.initBlock('begin', 'program');
		this.lex_comment();

		do {
			this.i++;
			this.lex_comment();
			this.lex_operator('begin');
			this.blocks.current = 'begin';
		} while (this.data[this.i].type === 'semicolon');
	});

	// Пропускает end и комментарии, влияет на i
	// Проверка объявления end
	private lex_end = this.mutator(() => {
		if (this.errors.length) return;
		const lex = this.data[this.i];
		this.i++;
		if (lex.lexeme !== 'end')
			return this.errors.push(new Error('Unexpected name, awaited: end', lex));
		if (this.i < this.data.length - 1)
			return this.push('Unexpected expressions, after program end', this.data[this.i]);
		this.lex_comment();
	});

	private lex_comare = () => {
		if (this.errors.length) return;
		this.lex_comment();
	};

	// Пропускавет слово после проверки, влияет на i
	// Проверка переменной и её блочной видимосьти
	private lex_variable = this.mutator((type: string) => {
		const lex = this.data[this.i];
		const isVar = this.lex_name();
		this.i++;
		if (!isVar) return this.push('Missing variable name or name is incorrect', lex);
		if (lex.type !== 'wtf') return this.push('Variable declared by system', lex);
		if (!this.blocks.current) return this.push('Variables declaration on global state', lex);
		if (this.blocks.blocks[this.blocks.current].variables[lex.lexeme])
			return this.push('Already declared at state block', lex);
		this.blocks.blocks[this.blocks.current].variables[lex.lexeme] = type;
	});

	// Не влияет на i
	// Проверка допустимосьти переменной
	private lex_name = this.mutator((): boolean => {
		const lex = this.data[this.i];
		const regexp = new RegExp(/^[a-zA-ZА-Яа-яЁё]+/);
		if (!regexp.test(lex.lexeme)) return false;
		return true;
	});

	// Пропускавет слово после проверки, влияет на i
	// Проверка типа данных
	private lex_type = this.mutator(() => {
		const lex = this.data[this.i];
		this.i++;
		if (dict['data types'].indexOf(lex.lexeme) === -1)
			return this.push('Unknown data type', lex);
	});

	// Не влияет на i
	// Проверка допустимосьти значения
	private lex_value = this.mutator((type: string): boolean => {
		const lex = this.data[this.i];
		let regexp: RegExp;
		if (type === 'int') regexp = new RegExp(/^[0-9]+$/);
		else if (type === 'bool') regexp = new RegExp(/true|false/);
		else if (type === 'float') regexp = new RegExp(/^[0-9]+\.[0-9]/);
		else return false;

		return regexp.test(lex.lexeme);
	});

	private lex_operator = this.mutator((parent: string) => {
		const lex = this.data[this.i];
		// Сложный оператор
		if (lex.type === 'compound') {
			// Входим в сложный оператор
			if (lex.lexeme === '[') {
				const block = v4.generate();
				this.initBlock(block, parent);
				this.i++;
				this.lex_operator(block);
			}
			// Неожиданный выход сложного оператора
			else if (lex.lexeme === ']' && (parent === 'begin' || parent === 'program'))
				return this.push('Unexpected compound end', lex);
			// Выходим из сложного оператора
			else if (this.blocks.current)
				this.blocks.current = this.blocks.blocks[this.blocks.current].parent;
		}
		// Присваивание
		else if (lex.type === 'wtf') {
			const isVar = this.lex_name();
			if (!isVar) return this.push('Incorrect variable name', lex);
			let current = this.blocks.current;
			if (!current) return this.push('Unexpected word', lex);
			let block = this.blocks.blocks[current];
			let type = block.variables[lex.lexeme];
			while (!type && current) {
				current = block.parent;
				if (!current) return this.push('Underfined variable intitilization', lex);
				block = this.blocks.blocks[current];
				type = block.variables[lex.lexeme];
			}
			this.i++;
			this.lex_set();
			const flag = this.lex_value(type);
			if (!flag) return this.push('Incorrect value type', lex);
		}

		if (parent !== 'begin' && parent !== 'program') {
			this.i++;

			this.lex_operator(parent);
		}
	});

	private lex_oneOfOperators = () => {};

	private lex_set = this.mutator(() => {
		if (this.errors.length) return;
		const lex = this.data[this.i];
		this.i++;
		if (lex.type !== 'appropriation')
			return this.push('Unexpected, awaited appropriation: as', lex);
		this.lex_comment();
	});

	private lex_setVarEnd = (block: string) => {
		if (this.errors.length) return;
		this.lex_comment();
	};

	private lex_setVarStart = this.mutator((block: string) => {
		const lex = this.data[this.i];
		const isVar = this.lex_name();
		if (!isVar) return this.push('Missing variable name or name is incorrect', lex);
		const currentblock = this.blocks.blocks[block];
		let parent = currentblock.parent;

		let flag = false;
		for (const variable of Object.keys(currentblock.variables))
			if (variable === lex.lexeme) {
				flag = true;
				break;
			}

		while (parent && !flag) {
			let blockParent = this.blocks.blocks[parent];
			for (const variable of Object.keys(blockParent.variables))
				if (variable === lex.lexeme) {
					flag = true;
					break;
				}

			parent = blockParent.parent;
		}

		if (!flag) return this.push('Variable not defined', lex);
	});

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
