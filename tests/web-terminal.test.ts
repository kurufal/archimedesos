import { expect,test } from 'bun:test';
import { attachDemoTransport,createDemoSession,TERMINAL_SCROLLBACK,terminalReplay } from '../apps/web/src/lib/tools/terminal';

test('terminal transport is bounded, isolated, simulated and inert after disposal', () => {
  const first=createDemoSession({host:'core',label:'Local',kind:'local'});
  const second=createDemoSession({host:'compute',label:'Remote',kind:'remote'});
  expect(first.id).not.toBe(second.id);
  const output:string[]=[];
  const transport=attachDemoTransport(first,text=>output.push(text),()=>{});
  transport.input('hostname\r');
  expect(terminalReplay(first)).toContain('Local');
  expect(terminalReplay(second)).not.toContain('hostname');
  transport.input('rm -rf /\r');
  expect(output.join('')).toContain('Unsupported demo command');
  transport.resize(80,24);
  expect(first.cols).toBe(80);
  for(let index=0;index<TERMINAL_SCROLLBACK+20;index++) transport.input('\r');
  expect(first.lines).toHaveLength(TERMINAL_SCROLLBACK);
  transport.dispose();
  transport.input('help\r'); transport.resize(10,10);
  expect(first.lines.at(-1)).toBe('$ ');
  expect(first.cols).toBe(80);
});