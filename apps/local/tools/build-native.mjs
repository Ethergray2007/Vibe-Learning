import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const native=fileURLToPath(new URL('../native/',import.meta.url));
const compiler=process.env.VIBE_CPP || 'C:\\msys64\\ucrt64\\bin\\g++.exe';
const result=spawnSync(compiler,['-std=c++17','-O2','-shared','-static-libgcc','-static-libstdc++',path.join(native,'job-control.cpp'),'-o',path.join(native,'job-control.node')],{stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status||1);
