import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default [
	{
		input: 'src/index.ts',
		output: [
			{
				file: 'dist/index.cjs.js',
				format: 'cjs',
			},
			{
				file: 'dist/index.es.js',
				format: 'es',
			},
			{
				file: 'dist/proxserve.js',
				format: 'iife',
				name: 'Proxserve',
				sourcemap: true,
			},
		],
		plugins: [typescript()],
	},
];