#!/bin/bash
rm simulate2*
gcc -o simulate simulate.c
cp simulate simulate2.23
cp simulate simulate2.27
cp simulate simulate2.29
cp simulate simulate2.31
cp simulate simulate2.32
cp simulate simulate2.33
cp simulate simulate2.34
./change_libc.sh libs/2.23-0ubuntu3_amd64 simulate2.23
./change_libc.sh libs/2.27-3ubuntu1_amd64 simulate2.27
./change_libc.sh libs/2.29-0ubuntu2_amd64 simulate2.29
./change_libc.sh libs/2.31-0ubuntu9_amd64 simulate2.31
./change_libc.sh libs/2.32-0ubuntu3_amd64 simulate2.32
./change_libc.sh libs/2.33-0ubuntu5_amd64 simulate2.33
./change_libc.sh libs/2.34-0ubuntu3_amd64 simulate2.34