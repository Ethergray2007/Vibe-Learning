// Test compiler: copies a real, precompiled probe; other builds hang for 60s.
// Wide Windows APIs preserve paths; no handcrafted PE bytes or dynamic C++ DLLs.
#include <windows.h>
#include <shellapi.h>
#include <cwchar>
#include <cstdio>
int main() {
    int argc=0;
    auto argv=CommandLineToArgvW(GetCommandLineW(),&argc);
    if(!argv) return 2;
    bool probe=false;
    const wchar_t* output=nullptr;
    for(int i=1;i<argc;i++) {
        if(wcsstr(argv[i],L"probe.cpp")) probe=true;
        if(wcscmp(argv[i],L"-o")==0 && i+1<argc) output=argv[i+1];
    }
    if(probe) {
        wchar_t from[32768];
        if(!GetEnvironmentVariableW(L"VIBE_TEST_PROBE",from,32768) || !output || !CopyFileW(from,output,FALSE)) {
            std::fprintf(stderr,"fixture CopyFileW failed: %lu\n",GetLastError());
            LocalFree(argv);return 2;
        }
        LocalFree(argv);return 0;
    }
    LocalFree(argv);Sleep(60000);return 0;
}
