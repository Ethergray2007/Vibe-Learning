// No executable starts until the supervisor has assigned this worker to a Job.
import {spawn} from 'node:child_process';
let started=false;
const finish=message=>{
  if(process.connected)process.send(message,()=>process.exit(0));else process.exit(0);
};
process.once('message',message=>{
  if(started||message?.type!=='start')return;started=true;
  try{
    const target=spawn(message.command,message.args,{cwd:process.cwd(),env:process.env,windowsHide:true,stdio:['ignore','inherit','inherit']});
    target.once('error',error=>finish({type:'spawn-error',error:[error.code,error.message].filter(Boolean).join(' ')}));
    target.once('exit',(code,signal)=>finish({type:'target-exit',code,signal}));
  }catch(error){finish({type:'spawn-error',error:error.message});}
});
// The supervisor observes the host process too; disconnect never leaves a worker.
process.once('disconnect',()=>process.exit(0));
