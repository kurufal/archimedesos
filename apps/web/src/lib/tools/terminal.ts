export const MAX_TERMINAL_TABS = 8;
export const TERMINAL_SCROLLBACK = 2000;
const MAX_INPUT = 256;
export type TerminalTarget = { host:string; label:string; kind:'local'|'remote'|'container'; containerId?:string };
export interface TerminalSession {
  id: number;
  target: TerminalTarget;
  status: 'Demo session';
  input: string;
  lines: string[];
  cols: number;
  rows: number;
}
export interface TerminalTab { id:number; title:string; session:TerminalSession; revision:number; startedAt?:number; }
export interface TerminalTransport {
  input(data:string):void;
  resize(cols:number,rows:number):void;
  dispose():void;
}

const prompt = '$ ';
let nextSessionId = 1;
export function createDemoSession(target:TerminalTarget):TerminalSession {
  return {id:nextSessionId++,target,status:'Demo session',input:'',lines:[`Demo terminal: ${target.label}`, 'No host connection. Type help.'],cols:0,rows:0};
}
export function attachDemoTransport(session:TerminalSession, write:(text:string)=>void, reset:()=>void):TerminalTransport {
  let open = true;
  function append(line:string) {
    session.lines.push(line);
    if (session.lines.length > TERMINAL_SCROLLBACK) session.lines.splice(0,session.lines.length - TERMINAL_SCROLLBACK);
  }
  return {
    input(data) {
      if (!open || data.includes('\x1b')) return;
      for (const character of data) {
        if (character === '\r' || character === '\n') {
          const command = session.input.trim();
          const echo = prompt + session.input;
          session.input = '';
          if (command === 'clear') {session.lines = []; reset(); write(prompt); continue;}
          const response = command === 'help' ? 'Demo commands: help, hostname, status, clear' : command === 'hostname' ? session.target.label : command === 'status' ? 'Simulated session. No commands run on the host.' : command ? 'Unsupported demo command. Type help.' : '';
          append(echo);
          if (response) append(response);
          write('\r\n' + (response ? response + '\r\n' : '') + prompt);
        } else if (character === '\x7f' || character === '\b') {
          if (session.input) { session.input = session.input.slice(0,-1); write('\b \b'); }
        } else if (character >= ' ' && character <= '~' && session.input.length < MAX_INPUT) {
          session.input += character; write(character);
        }
      }
    },
    resize(cols,rows) { if (open) {session.cols = cols; session.rows = rows;} },
    dispose() { open = false; },
  };
}

export function terminalReplay(session:TerminalSession) {
  return (session.lines.length ? session.lines.join('\r\n') + '\r\n' : '') + prompt + session.input;
}