#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <sys/personality.h>

void func_malloc(char *str) {
    int size = atoi(str);
    int *p = malloc(size);
	printf("malloc %p\n", p);
}

void func_calloc(char *str) {
    int size = atoi(str);
    int *p = calloc(size, 1);
	printf("calloc %p\n", p);
}

void func_free(char *addr) {
    int ptr = atoi(addr);
    void * p = &ptr;
    p = (void *)ptr;
    free(p);
	printf("free %p\n", p);
}

void func_edit(char *addr, char *str) {
    int i = 0;
    char * ptr = (char *)atoi(addr);
    while(i<strlen(str)) {
        int c = 0;
        if(str[i] >= 97) {
            c += (str[i]-97+10)*16;
        }
        else {
            c += (str[i]-48)*16;
        }
        if(str[i+1] >= 97) {
            c += str[i+1]-97+10;
        }
        else {
            c += str[i+1]-48;
        }
        *ptr = c;
        ptr += 1;
        i += 2;
    }
    printf("edit 0x%X\n", atoi(addr));
}

int main(int argc, char **argv) {
    setvbuf(stdin, 0,2,0);
	setvbuf(stdout,0,2,0);
	setvbuf(stderr,0,2,0);
    // 关闭aslr -> 仅本程序
    const int old_personality = personality(ADDR_NO_RANDOMIZE);
    if (!(old_personality & ADDR_NO_RANDOMIZE)) {
        const int new_personality = personality(ADDR_NO_RANDOMIZE);
        if (new_personality & ADDR_NO_RANDOMIZE) {
            execv(argv[0], argv);
        }
    }

    // 输出pid -> 从python中获得
    int pid = getpid();
    //printf("pid:%d\n", pid);

    // 读取参数
    int i = 1;
    int func_index = 0;
    while(i < argc)
    {
        printf("step%d ", func_index);
        func_index += 1;
        int func = atoi(argv[i]);
        switch(func) {
            case 1: // malloc
                func_malloc(argv[i+1]); i+=2; break;
            case 2: // calloc
                func_calloc(argv[i+1]); i+=2; break;
            case 3: // free
                func_free(argv[i+1]); i+=2; break;
            case 4: // change byte
                func_edit(argv[i+1], argv[i+2]); i+=3; break;
            default:
                puts("error choice!");
                exit(-1);
        }
    }
    puts("end!");

    while(1){
        sleep(1);
    }

}








