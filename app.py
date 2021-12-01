# -*- coding: utf-8 -*-
import os
import copy
from subprocess import Popen, PIPE, STDOUT
import time
import json
from heapinspect.core import *
from flask import Flask, render_template, request, jsonify

def memToHex(mem, size_t=8):
    result = ""
    for i in range(len(mem)/8):
        result += mem[i*size_t:i*size_t+size_t][::-1].encode('hex')
    return result

def bin_to_dic(chunk):
    return {"addr":chunk._addr, "prev_size":chunk.prev_size, "size":chunk.size, "fd":chunk.fd, "bk":chunk.bk}

def largebin_to_dic(chunk):
    result = bin_to_dic(chunk)
    result['fd_nextsize'] = chunk.fd_nextsize
    result['bk_nextsize'] = chunk.bk_nextsize
    return result

def chunks_to_dic(chunks):
    result = []
    for chunk in chunks:
        result.append(bin_to_dic(chunk))
    return result

def indexed_chunks_to_dic(chunk_dict, typ=""):
    result = []
    for index in sorted(chunk_dict.keys()):
        result.append({index:[]})
        chunks = chunk_dict[index]
        for chunk in chunks:
            if typ == 'largebin':
                result[-1][index].append(largebin_to_dic(chunk))
            else:
                result[-1][index].append(bin_to_dic(chunk))
    return result

# 将内存解析为显示的格式
def parseMem(mem, size_t=8):
    result = ""
    for i in range(len(mem)/size_t):
        result += mem[i*size_t:i*size_t+size_t][::-1]
    return result

def get_heap_info_from_pid(pid):
    hi = HeapInspector(pid)
    heap_mem = hi.proc.read(hi.heap_base, hi.top._addr-hi.heap_base+0x100)
    heap_mem = parseMem(heap_mem)
    heap_info = {}
    # heap base
    heap_info['heap_base'] = hi.heap_base
    # top chunk
    heap_info['top'] = bin_to_dic(hi.top)
    # last_remainder
    heap_info['last_remainder'] = bin_to_dic(hi.last_remainder)
    # unsorted
    heap_info['unsortedbin'] = chunks_to_dic(hi.unsortedbins)
    # tcache
    heap_info['tcache'] = indexed_chunks_to_dic(hi.tcache_chunks)
    # fastbin
    heap_info['fastbin'] = indexed_chunks_to_dic(hi.fastbins)
    # smallbin
    heap_info['smallbin'] = indexed_chunks_to_dic(hi.smallbins)
    # largebin
    heap_info['largebin'] = indexed_chunks_to_dic(hi.largebins, typ="largebin")
    # heap mem
    heap_info['heap_mem'] = heap_mem.encode('hex')
    # heap chunks
    heap_info['chunks'] = chunks_to_dic(hi.heap_chunks)
    return heap_info

def get_response(code, msg, data, simulate_index):
    return jsonify({"code":code, "msg":msg, "data":data, "simulate_index":simulate_index})

def str2dec(s):
    if isinstance(s, int):
        return s
    s = s.strip()
    i = 0
    if s.startswith("0x"):
        i = int(s, 16)
    else:
        i = int(s)
    return str(i)

def parse_error_info(s):
    return s

app = Flask(__name__)

@app.route('/')
@app.route('/index.html')
def index():
    return app.send_static_file('index.html')

@app.route('/favicon.ico')
def favicon():
    return app.send_static_file('favicon.ico')


@app.route('/simulate', methods=['POST'])
def simulate():
    data = json.loads(request.get_data(as_text=True))
    if not data or "steps" not in data or "libc" not in data:
        return get_response(500, "params error!", "", 0)
    libc = data['libc']
    steps = data['steps']
    simulate_index = data['simulate_index']
    cur_dir = os.path.dirname(os.path.realpath(__file__))
    #exe_file = cur_dir + "/simulate/simulate" + libc.replace("libc","")
    exe_file = "simulate/simulate" + libc.replace("libc","")
    argvs = [exe_file]
    # [ ['malloc','0x23333'],[...] ]
    for step in steps:
        func = step[0]
        if(func == "malloc"):   argvs.extend(['1', str2dec(step[1])])
        elif(func == "calloc"): argvs.extend(['2', str2dec(step[1])])
        elif(func == "free"):   argvs.extend(['3', str2dec(step[1])])
        elif(func == "edit"):   argvs.extend(['4', str2dec(step[1]), step[2]])
    #print(" ".join(argvs))
    env = copy.copy(os.environ)
    env["LIBC_FATAL_STDERR_"] = "1"
    proc = Popen(argvs, stdout=PIPE, stderr=PIPE, env=env)
    #print("pid: "+str(proc.pid))
    #for step in steps: print("\t"+" ".join(step))
    stdout = []
    hasEnd = False
    while True:
        buff = proc.stdout.readline()
        if buff.strip() == 'end!':
            hasEnd = True
            break
        elif buff == '' and proc.poll() != None:
            break
        if buff: stdout.append(buff.strip())
    # 报错了没有内存信息
    if not hasEnd:
        stderr = proc.stderr.read()
        return get_response(501, "glibc error", stderr, simulate_index)
    # exeFile = "/proc/%d/exe" % proc.pid
    # if(not os.path.exists(exeFile)):
    heap_info = get_heap_info_from_pid(proc.pid)
    heap_info['stdout'] = stdout
    proc.kill()
    proc.wait()
    return get_response(200, "ok", heap_info, simulate_index)
    
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=False)
