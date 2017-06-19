import * as path from 'path';
import { optimize } from 'webpack';

module.exports = {
  entry: {
    'App': './App.tsx',

    'react-form-with-constraints': 'react-form-with-constraints',
    react: ['react', 'prop-types', 'react-dom']
  },

  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].js'
  },

  plugins: [
    new optimize.CommonsChunkPlugin({names: ['react-form-with-constraints', 'react']})
  ],

  resolve: {
    extensions: ['.js', '.ts', '.tsx']
  },

  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'ts-loader', options: {compilerOptions: {declaration: false}} }
    ]
  }
};
