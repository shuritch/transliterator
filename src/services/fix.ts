const fixInput = (input: string) => {
	// Правим разделители
	return input
		.replace(/\,/g, ' , ')
		.replace(/\;/g, ' ; ')
		.replace(/\[/g, ' [ ')
		.replace(/\]/g, ' ] ')
		.replace(/\}/g, ' } ')
		.replace(/\{/g, ' { ')
		.replace(/\(/g, ' ( ')
		.replace(/\)/g, ' ) ')

		.replace(/\-/g, ' - ')
		.replace(/\+/g, ' + ')
		.replace(/\*/g, ' * ')
		.replace(/\//g, ' / ')

		.replace(/\>\=/g, ' >= ')
		.replace(/\<\=/g, ' <= ')
		.replace(/\<\>/g, ' <> ')
		.replace(/\>/g, ' > ')
		.replace(/\</g, ' < ')
		.replace(/\=/g, ' = ')
		.replace(/\>  \=/g, '>=')
		.replace(/\<  \=/g, '<=')
		.replace(/\<  \>/g, '<>')

		.replace(/\r\n/g, ' __newLineParserInfo ')
		.replace(/\n\r/g, ' __newLineParserInfo ')
		.replace(/\t/g, ' ')
		.replace(/\s\s+/g, ' ');
};

export default fixInput;
