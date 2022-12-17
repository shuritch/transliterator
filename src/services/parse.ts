import { TLex } from './parse.type.ts';
import typeAnalyzer from './type.ts';
import fixInput from './fix.ts';

/**
 *! Приницп работы парса
 ** Разбиваем входной файл на ключевые слова
 ** Разбиваем ключевые слова слитно написанные с разделителями
 ** Создаём массив со структрами содержащими
 ** слово, его положение в файле, группу в словаре
 ** также находим слова не из словаря (могут быть переменными или цифрами)
 */
const parse = (input: string): Array<TLex> => {
	let row = 1; // Номер строки
	let col = 1; // Номер символа

	input = fixInput(input);
	const data = input.split(' '); // wordslist

	const result: Array<TLex> = [];
	for (let [, value] of Object.entries(data)) {
		if (!value) continue;

		if (value === '__newLineParserInfo') {
			row++;
			col = 1;
			continue;
		}

		const type = typeAnalyzer(value);
		const word = new TLex(value, type ?? 'wtf', col, row);
		result.push(word);

		col += value.length;
	}

	return result;
};

export default parse;
