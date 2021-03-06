#! /usr/bin/env node
import { default as chalk } from 'chalk';
import { copyFileSync, existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import * as glob from 'glob';
import { Iconv } from 'iconv';
import { indexOf, merge, random } from 'lodash';
import { extname, join } from 'path';
import { exit } from 'process';
import { default as Uchardet } from 'uchardet';

import { detectLocale, echo } from './helpers';
import { prompt } from './prompts/encode';

const params = {
  fs: {
    bufferSize: 64,
    lowWaterMark: 0,
    highWaterMark: 64,
    autoClose: true,
  },
};

const error = (name) => {
  const message = ([
    chalk.red('[Error]'),
    chalk.cyan(name),
    chalk.grey('is a dependency and needs to be available on your '),
    chalk.yellow('Exit...')
  ]).join(' ');

  exit(1);
};

const detect = (src: string) => {
  const uchardet = new Uchardet();
  let charset = null;

  try {
    charset = uchardet.detect(src)
  } catch(e) {
    // Try one more time, weird OSX glitch
    charset = uchardet.detect(src);
  }

  return charset;
}

const defaults = {
  to: 'UTF-8',
  backup: false,
}

export const Encode = (src: string, options: any = {}) => {
  options = merge({
    from: detect(src)
  }, defaults, options);

  // Read
  const input = readFileSync(src);
  const backup = `${src}.backup`;

  // Backup
  if(options.backup) {
    writeFileSync(backup, input);
    console.log(`${chalk.cyan('[Backup]')} ${chalk.white(src)} => ${chalk.green(backup)}`);
  }

  // Verify detection
  if(!(options.from || '').length) {
    return 'en';
  }

  const iconv = new Iconv(options.from, `${options.to}//IGNORE`);

  // Read, Encode, and Write
  const output = iconv.convert(input).toString('utf8');
  const sample = output.replace(/[0-9:a-z,=]/gi, '');
  const locale = detectLocale(sample);

  writeFileSync(src, output);

  console.log(`${chalk.green('[Processed]')} ${chalk.cyan(src)}`);

  return locale;
};

const init =  () => {
  prompt
    .ask(prompt.queue)
    .then((params: any) => {
      let paths: Array<string>;

      params.path = echo(params.path);

      if(params.paths) {
        Encode(params.path, {
          to: params.to,
          backup: true,
        });
      } else {
        console.log([
          chalk.red('[Error]'),
          `Could not locate file at ${params.path}!`,
          chalk.yellow('Aborting'),
        ].join(' '));
        exit();
      }
    })
   .catch((e) => {
     console.log(e);
   });
};

export default init;
