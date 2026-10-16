#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <cstdio>
#define NAPI_VERSION 8
#include "../node_modules/node-api-headers/include/node_api.h"
// Load stable Node-API exports from the current host, avoiding a Node-version
// specific import library. All process access runs in the Node host context.
#define API(name) static decltype(&name) p_##name
API(napi_get_cb_info); API(napi_throw_error); API(napi_create_external);
API(napi_get_value_external); API(napi_get_value_uint32); API(napi_get_undefined);
API(napi_create_function); API(napi_set_named_property);
struct Job {HANDLE handle;};
static napi_value error(napi_env env,const char* operation) {
    char text[160];std::snprintf(text,sizeof(text),"%s failed (%lu)",operation,GetLastError());
    p_napi_throw_error(env,nullptr,text);return nullptr;
}
static void finalize(napi_env,void* data,void*){auto job=static_cast<Job*>(data);if(job->handle)CloseHandle(job->handle);delete job;}
static napi_value create(napi_env env,napi_callback_info) {
    HANDLE handle=CreateJobObjectW(nullptr,nullptr);if(!handle)return error(env,"CreateJobObject");
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};limits.BasicLimitInformation.LimitFlags=JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    if(!SetInformationJobObject(handle,JobObjectExtendedLimitInformation,&limits,sizeof(limits))){CloseHandle(handle);return error(env,"SetInformationJobObject");}
    auto job=new Job{handle};napi_value value;
    if(p_napi_create_external(env,job,finalize,nullptr,&value)!=napi_ok){CloseHandle(handle);delete job;return nullptr;}return value;
}
static Job* getJob(napi_env env,napi_callback_info info,napi_value* args,size_t& count) {
    if(p_napi_get_cb_info(env,info,&count,args,nullptr,nullptr)!=napi_ok)return nullptr;
    void* data=nullptr;if(count<1||p_napi_get_value_external(env,args[0],&data)!=napi_ok)return nullptr;
    return static_cast<Job*>(data);
}
static napi_value assign(napi_env env,napi_callback_info info) {
    napi_value args[2];size_t count=2;auto job=getJob(env,info,args,count);uint32_t pid=0;
    if(!job||count<2||p_napi_get_value_uint32(env,args[1],&pid)!=napi_ok)return nullptr;
    HANDLE worker=OpenProcess(PROCESS_SET_QUOTA|PROCESS_TERMINATE,FALSE,pid);
    if(!worker)return error(env,"OpenProcess worker");
    BOOL ok=AssignProcessToJobObject(job->handle,worker);DWORD last=GetLastError();CloseHandle(worker);
    if(!ok){SetLastError(last);return error(env,"AssignProcessToJobObject");}
    napi_value value;p_napi_get_undefined(env,&value);return value;
}
static napi_value terminate(napi_env env,napi_callback_info info) {
    napi_value args[1];size_t count=1;auto job=getJob(env,info,args,count);if(!job)return nullptr;
    if(job->handle){
        if(!TerminateJobObject(job->handle,0))return error(env,"TerminateJobObject");
        bool empty=false;
        for(int i=0;i<200;i++) {JOBOBJECT_BASIC_ACCOUNTING_INFORMATION state{};
            if(!QueryInformationJobObject(job->handle,JobObjectBasicAccountingInformation,&state,sizeof(state),nullptr))return error(env,"QueryInformationJobObject");
            if(state.ActiveProcesses==0){empty=true;break;}Sleep(10);
        }
        if(!empty){SetLastError(WAIT_TIMEOUT);return error(env,"wait for job exit");}
        CloseHandle(job->handle);job->handle=nullptr;
    }
    napi_value value;p_napi_get_undefined(env,&value);return value;
}
NAPI_MODULE_INIT() {
    HMODULE host=GetModuleHandleW(nullptr);
#define LOAD(name) p_##name=reinterpret_cast<decltype(p_##name)>(GetProcAddress(host,#name));if(!p_##name)return nullptr
    LOAD(napi_get_cb_info);LOAD(napi_throw_error);LOAD(napi_create_external);LOAD(napi_get_value_external);
    LOAD(napi_get_value_uint32);LOAD(napi_get_undefined);LOAD(napi_create_function);LOAD(napi_set_named_property);
    struct Entry {const char* name;napi_callback callback;} entries[]={{"create",create},{"assign",assign},{"terminate",terminate}};
    for(auto entry:entries){napi_value fn;if(p_napi_create_function(env,entry.name,NAPI_AUTO_LENGTH,entry.callback,nullptr,&fn)!=napi_ok)return nullptr;if(p_napi_set_named_property(env,exports,entry.name,fn)!=napi_ok)return nullptr;}
    return exports;
}
