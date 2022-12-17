import dict from '../../data/dictionary.json' assert { type: 'json' };

// Определяем тип лексемы (Например: >= - оператор сравнения)
const typeAnalyzer = (input: string): null | string => {
	for (const [key, value] of Object.entries(dict))
		for (const word of value) if (word === input) return key;

	return null;
};

export default typeAnalyzer;
