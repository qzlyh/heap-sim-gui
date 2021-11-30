var simulate_index = 0;

var hasCursor = 0;
var cursor_index = 0;
var last_cursor_index = 0;

var font_width = 9;
var cellSizeY = 18;

var start_x = 15;
var start_y = 30;

var hexIndex = 18;
var gapIndex = 67;
var asciiIndex = 69;

var hexDataArr = [];
var startAddr = 0;

var keyDown = 0;

var mouseDown = 0;
var mouseIn   = false;
var selectStart = -1, selectEnd = -1;

var heap_base = 0;
var heap_mem = "";
var mouseWheelIndex = 0;

// start
$(document).ready(function () {
    $("#table").bootstrapTable({
        reorderableRows: true,
        striped: true,
        useRowAttrFunc: true,
        uniqueId:'id',
        rowStyle: rowStyle, // 通过自定义函数设置行样式
        onReorderRow: function (newdata) { // 拖动监听函数
            get_data_by_steps(); // 发包改数据
        },
        onClickCell: function (field, value, row, $element) {
            if(row.step.indexOf("edit") == 0) {
                var size = row.step.split(' ')[2];
                showChunk(row.addr, parseInt(size));
                return;
            }
            showChunk(row.addr-0x10, 0x20);
        },
        // 点击每一个单选框时触发的操作
        onCheck: function(row){
            get_data_by_steps(); // 发包改数据 
        },
        // 点击全选框时触发的操作
        onCheckAll: function(rows){
            get_data_by_steps(); // 发包改数据 
        },
        //取消每一个单选框时对应的操作；
        onUncheck: function(row){
            get_data_by_steps(); // 发包改数据 
        },
        // 取消所有
        onUncheckAll: function (row) {
            get_data_by_steps(); // 发包改数据
        },
        columns: [{   
            field : 'checked',
            checkbox: true,
            align: 'center',
            valign: 'middle',
            formatter: function(value, row, index) { 
                if(row.checked === undefined) {
                    return {checked: true};
                }
                else {
                    return {checked: row.checked};
                }
            },
        },{
            field: 'id',
            title: 'id',
            visible:false
        },{
            field: 'addr',
            title: 'addr',
            visible:false
        },{
            field: 'list',
            title: 'list',
            visible:false
        },{
            field: 'step',
            title: 'step',
            formatter: addFunctionAlty  // 表格中增加按钮  
        }],
    });

    // 行背景
    function rowStyle(row, index) {
        var classes = ['active', 'success', 'info', 'warning', 'danger'];
        if(row.step.indexOf("malloc") == 0 | row.step.indexOf("calloc") == 0) {
            return { classes: 'success' };
        }
        else if(row.step.indexOf("edit") == 0 ) {
            return { classes: 'info' };
        }
        else if(row.step.indexOf("free") == 0 ) {
            return { classes: 'danger' };
        }
        return {};
    }
    // 添加删除键 / free按键
    function addFunctionAlty(value, row, index) {
        result = [value];
        result.push('<button onclick="delete_step('+index+',\''+row.id+'\');" type="button" class="btn btn-danger btn-sm" style="float:right;">&nbsp;X&nbsp;</button>');
        if(row.step.indexOf("malloc") == 0 | row.step.indexOf("calloc") == 0) {
            result.push('<button onclick="free_step(\''+row.id+'\');" type="button" class="btn btn-warning btn-sm" style="float:right;">free</button>');
        }
        return result.join(" ");
    }

    // button listen
    $("#malloc_btn").click(function(){
        size = $("#malloc_size").val();
        if(size=="") {
            alert("error!");return;
        }
        add_step(['malloc',size], "malloc "+size);
    });
    $("#calloc_btn").click(function(){
        size = $("#calloc_size").val();
        if(size=="") {
            alert("error!");return;
        }
        add_step(['calloc',size], "calloc "+size);
    });
    $("#free_btn").click(function(){
        addr = $("#free_addr").val();
        if(addr=="") {
            alert("error!");return;
        }
        add_step(['free',addr], "free "+addr);
    });
    $("#error_btn").click(function(){
        if($("#error_content").html() != "") {
            $("#error_modal").modal("toggle");
        }
    });
    $("#clear_btn").click(function(){
        clear_steps();
        location.reload();
    });
    $("#libc").change(function(){
        simulate_index = 0;
        get_data_by_steps(); // 发包改数据
    });

    restore_steps();
});

// ui ---------------------------------------------
function add_step(step, str) {
    $("#table").bootstrapTable('append', {id:randomString(32), step:str, list:step, addr:-1});
    $("#table").bootstrapTable('scrollTo', 'bottom');
    get_data_by_steps(); // 发包改数据
}

function delete_step(index, id) {
    $("#table").bootstrapTable('remove', {field: 'id', values:[id]});
    get_data_by_steps(); // 发包改数据
}

function free_step(id) {
    var row = $('#table').bootstrapTable('getRowByUniqueId', id);
    add_step(['free', row.addr.toString()], "free 0x"+row.addr.toString(16));
}

function edit_step(cursor_index) {
    var hexData = "";
    var rows = $("#table").bootstrapTable("getData");
    var last_row = rows[rows.length-1];
    var cursor_index_16 = Math.floor(cursor_index / 16);
    if(last_row.step.indexOf("edit") == 0) {
        last_edit_start = (parseInt(last_row.addr)-startAddr)/8;
        last_edit_end   = last_edit_start + Math.floor(last_row.list[2].length/16)-1;
        if(cursor_index_16 >= last_edit_start-1 & cursor_index_16 <= last_edit_end+1) { 
            last_edit_start = Math.min(last_edit_start, cursor_index_16);
            last_edit_end   = Math.max(last_edit_end, cursor_index_16);
            // 更新最后一条
            for(var i=last_edit_start;i<=last_edit_end;i++) {
                var tmp = "";
                for(var j=0;j<8;j++) {
                    tmp = hexDataArr[i*16+j*2] + hexDataArr[i*16+j*2+1] + tmp;
                }
                hexData += tmp;
            }
            last_row.addr = startAddr + last_edit_start*8;
            last_row.size = hexData.length/2;
            last_row.step = "edit 0x"+last_row.addr.toString(16)+" "+hexData.length/2;
            last_row.list = ['edit', last_row.addr.toString(), hexData];
            $('#table').bootstrapTable("updateRow", {index:last_row.index, row:last_row});
            get_data_by_steps(); // 发包改数据
            return;
        }
    }
    // 新建一条
    for(var j=0;j<8;j++) {
        hexData = hexDataArr[cursor_index_16*16+j*2] + hexDataArr[cursor_index_16*16+j*2+1] + hexData;
    }
    var addr = startAddr + cursor_index_16*8;
    var str = "edit 0x"+addr.toString(16)+" "+hexData.length/2;
    var step = ['edit', addr.toString(), hexData];
    $("#table").bootstrapTable('append', {id:randomString(32), step:str, list:step, addr:addr});
    $("#table").bootstrapTable('scrollTo', 'bottom');
    get_data_by_steps(); // 发包改数据
}

function get_data_by_steps() {
    save_steps();
    rows = $("#table").bootstrapTable("getData");
    steps = [];
    for(var i=0; i<rows.length; i++) {
        row = rows[i];
        if(row['checked']) {
            steps.push(row['list']);
        }
    }
    if(steps.length > 0) {
        simulate_index += 1;
        data = {"steps":steps, "libc":$("#libc").val(), "simulate_index":simulate_index}
        $.ajax({
            type: "POST",
            url: "simulate",
            data: JSON.stringify(data),
            dataType: "json",
            success: function(data){
                if(data.simulate_index < simulate_index & simulate_index != 1) { // 只判断最新 和 第一次
                    return;
                }
                if(data.code == 200){
                    $("#error_btn").attr("class","btn btn-success");
                    $("#error_btn").html("Error(0)");
                    $("#error_content").html("");
                    if(simulate_index == 1) {
                        show_first_chunks();
                    }
                    show_heap_info(data.data);
                }
                else if(data.code == 501){ // glibc error
                    $("#error_btn").attr("class","btn btn-danger");
                    $("#error_btn").html("Error(1)");
                    $("#error_content").html(data.data);
                    $("#error_modal").modal("show");
                }
                else {
                    alert(data.msg);
                }
            }
        });
    }
}

// 跳过heap中关于tcache的第一块
function show_first_chunks() {
    // libc 2.27-2.29 tcache heap -> 0x250 -> 0x25 line
    // libc 2.31-     tcache heap -> 0x290 -> 0x29 line
    var libc_bersion = $("#libc").val();
    if(libc_bersion == "libc2.27" | libc_bersion == "libc2.29") {
        mouseWheelIndex = 0x25;
    }
    else if(libc_bersion == "libc2.31" | libc_bersion == "libc2.32" | libc_bersion == "libc2.33" | libc_bersion == "libc2.34") {
        mouseWheelIndex = 0x29;
    }
}

// 保存在localstorage
function save_steps() {
    libc = $("#libc").val();
    rows = $("#table").bootstrapTable("getData");
    save_str = JSON.stringify(rows);
    localStorage.removeItem('libc');
    localStorage.removeItem('steps');
    localStorage.setItem('libc',libc);
    localStorage.setItem('steps',save_str);
}

// 从localstorage恢复
function restore_steps() {
    libc     = localStorage.getItem('libc');
    save_str = localStorage.getItem('steps');
    if(libc != "" & libc != null) $("#libc").val(libc);
    if(save_str == "" | save_str == undefined | save_str == null) {
        return;
    }
    rows = JSON.parse(save_str);
    for(var i=0;i<rows.length;i++) {
        var row = rows[i];
        $("#table").bootstrapTable('append', row);
    }
    $("#table").bootstrapTable('scrollTo', 'bottom');
    get_data_by_steps(); // 发包改数据
}

// 清空localstorage
function clear_steps() {
    //localStorage.removeItem('libc');
    simulate_index = 0;
    localStorage.removeItem('steps');
}

// 展示heap信息
function show_heap_info(data) {
    // mouseWheelIndex = 0;
    heap_base = data.heap_base;
    chunks = data.chunks;
    heap_mem = data.heap_mem;
    tcache = data.tcache;
    fastbin = data.fastbin;
    smallbin = data.smallbin;
    largebin = data.largebin;
    unsortedbin = data.unsortedbin;
    top = data.top;
    last_remainder = data.last_remainder;
    stdout = data.stdout;
    fill_addr_info(stdout);
    showChunks(chunks);
    fillData(ctx, heap_base, heap_mem=heap_mem);
    show_bins(data);
}

// 插入chunk的addr信息，后续才能free
function fill_addr_info(lines) {
    for(var i=0;i<lines.length;i++) {
        line = lines[i];
        if(line.indexOf("step") == 0) {
            var index = parseInt(line.split(' ')[0].replace("step",""));
            var cell = {
                index : index, //更新列所在行的索引
                field : "addr", //要更新列的field
                value : parseInt(line.split(' ')[2],16) //要更新列的数据
            }//更新表格数据
            $('#table').bootstrapTable("updateCell",cell);
        }
    }
}

// 在hex展示单个chunk信息
function showChunk(addr,size) {
    mouseWheelIndex = (addr - startAddr)/32*2;
    if(mouseWheelIndex < 0) {
        mouseWheelIndex = 0;
    }
    var lineNum = heap_mem.length/32;
    if(lineNum-mouseWheelIndex <= 20) {
        mouseWheelIndex = lineNum-20;
    }
    selectStart = (addr - startAddr)*2;
    selectEnd   = selectStart + (size-size%2)*2 - 2;
    fillData(ctx, heap_base);
    clearAll(ctx_cursor);
    drawCursor(ctx_cursor, cursor_index);
    drawSelect(ctx_cursor, selectStart, selectEnd);
}

// 展示chunks信息
function showChunks(chunks) {
    html_str = ""
    for(var i=0; i<chunks.length; i++) {
        chunk = chunks[i];
        addr = chunk.addr;
        bk = chunk.bk;
        fd = chunk.fd;
        prev_size = chunk.prev_size;
        size = chunk.size;
        content = "<a href='javascript:showChunk("+addr+","+size+")'>0x"+addr.toString(16)+"</a> (size:0x"+size.toString(16)+" fd:0x"+fd.toString(16)+" bk:0x"+bk.toString(16)+")";
        html_str += '<li class="list-group-item">'+content+'</li>\n';
    }
    $("#chunk_list").html(html_str);
}

// 展示bin信息
function show_bins(data) {
    var tcaches = data.tcache;
    var fastbins = data.fastbin;
    var smallbins = data.smallbin;
    var largebins = data.largebin;
    var unsortedbins = data.unsortedbin;
    var top = data.top;
    var last_remainder = data.last_remainder;
    var html_str = "";
    // fastbin
    for(var i=0;i<fastbins.length;i++){
        tmp = "<p>";
        for (var index in fastbins[i]) {
            var fastbin1 = fastbins[i][index];
            tmp = "fastbin["+index+"]:";
            tmp = tmp.padStart(16, "_");
            tmp = "(0x"+(32+16*index).toString(16)+")_"+tmp
            tmp += "_";
            for(var j=0;j<fastbin1.length;j++){
                if(j!=0) tmp += "_→_";
                tmp += "<a class='fastbin' href='javascript:showChunk("+fastbin1[j]['addr']+","+fastbin1[j]['size']+")'>0x"+fastbin1[j]['addr'].toString(16)+"</a>";
            }
        }
        html_str += tmp+"</p>";
    }
    // top
    if(top.addr == 0){
        tmp = "top:".padStart(23, "_")+"_0x0";
    }
    else {
        tmp = "top:".padStart(23, "_")+"_<a class='top' href='javascript:showChunk("+top.addr+","+top.size+")'>0x"+top.addr.toString(16)+"</a>";
    }
    html_str += "<p>"+tmp+"</p>";
    // last_remainder
    if(last_remainder.addr == 0){
        tmp = "last_remainder:".padStart(23,"_")+"_0x0";
    }
    else{
        tmp = "last_remainder:".padStart(23,"_")+"_<a class='lastremainder' href='javascript:showChunk("+last_remainder.addr+","+last_remainder.size+")'>"+"0x"+last_remainder.addr.toString(16)+"</a>";
    }
    html_str += "<p>"+tmp+"</p>";
    // unsorted bin
    unsortedbin_str = "";
    for(var j=0; j<unsortedbins.length; j++) {
        chunk = unsortedbins[j];
        if(j!=0) unsortedbin_str += "_→_"
        unsortedbin_str += "<a class='unsortedbin' href='javascript:showChunk("+chunk.addr+","+chunk.size+")'>0x"+chunk.addr.toString(16)+"(0x"+(chunk.size-chunk.size%2).toString(16)+")</a>";
    }
    if(unsortedbin_str == "") unsortedbin_str += "0x0"
    html_str += "<p>"+"unsortedbin:".padStart(23,"_")+"_"+unsortedbin_str+"</p>";
    // tcache
    for(var i=0;i<tcaches.length;i++){
        tmp = "";
        for (var index in tcaches[i]) {
            var tcache1 = tcaches[i][index];
            tmp = "tcache["+index+"]:";
            if(32+16*index < 0x100) {
                tmp = tmp.padStart(16,"_");
            }
            else {
                tmp = tmp.padStart(15,"_");
            }
            tmp = "(0x"+(32+16*index).toString(16)+")_"+tmp;
            tmp += "_";
            for(var j=0;j<tcache1.length;j++){
                if(j!=0) tmp += "_→_";
                tmp += "<a class='tcache' href='javascript:showChunk("+tcache1[j].addr+","+tcache1[j].size+")'>0x"+tcache1[j]['addr'].toString(16)+"</a>";
            }
        }
        html_str += "<p>"+tmp+"</p>";
    }
    // small bin
    for(var i=0;i<smallbins.length;i++){
        tmp = "";
        for (var index in smallbins[i]) {
            var smallbins1 = smallbins[i][index];
            tmp = "smallbin["+index+"]:";
            if(16+16*index < 0x100) {
                tmp = tmp.padStart(16,"_");
            }
            else {
                tmp = tmp.padStart(15,"_");
            }
            tmp = "(0x"+(16+16*index).toString(16)+")_" + tmp;
            tmp += "_";
            for(var j=0;j<smallbins1.length;j++){
                if(j!=0) tmp += "_<->_";
                tmp += "<a class='smallbin' href='javascript:showChunk("+smallbins1[j].addr+","+smallbins1[j].size+")'>0x"+smallbins1[j]['addr'].toString(16)+"</a>";
            }
        }
        html_str += "<p>"+tmp+"</p>";
    }
    // large bin
    for(var i=0;i<largebins.length;i++){
        tmp = "";
        for (var index in largebins[i]) {
            var largebins1 = largebins[i][index];
            tmp = "(0x"+(16+16*index).toString(16)+")_largebins["+index+"]:";
            tmp = tmp.padStart(23,"_");
            tmp += "_";
            for(var j=0;j<largebins1.length;j++){
                if(j!=0) tmp += "_<->_";
                tmp += "<a class='largebin' href='javascript:showChunk("+largebins1[j].addr+","+largebins1[j].size+")'>0x"+largebins1[j]['addr'].toString(16)+"</a>";
            }
        }
        html_str += "<p>"+tmp+"</p>";
    }
    html_str = html_str.replace(/_/g,"&nbsp;");
    $("#bins").html(html_str);
}

// utils ------------------------------------------
Array.prototype.del=function(index){ 
    if(isNaN(index)||index>=this.length){ 
        return false; 
    } 
    for(var i=0,n=0;i<this.length;i++){ 
        if(this[i]!=this[index]){ 
        this[n++]=this[i]; 
        } 
    } 
    this.length-=1; 
};

function copyToClip(s) {
    let transfer = document.createElement('input');
    document.body.appendChild(transfer);
    transfer.value = s;  // 这里表示想要复制的内容
    transfer.focus();
    transfer.select();
    if (document.execCommand('copy')) {
        document.execCommand('copy');
    }
    transfer.blur();
    document.body.removeChild(transfer);
}

function randomString(length) {
    var str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) 
        result += str[Math.floor(Math.random() * str.length)];
    return result;
}

function hex2int(hex) {
    var len = hex.length, a = new Array(len), code;
    for (var i = 0; i < len; i++) {
        code = hex.charCodeAt(i);
        if (48<=code && code < 58) {
            code -= 48;
        } else {
            code = (code & 0xdf) - 65 + 10;
        }
        a[i] = code;
    }
    return a.reduce(function(acc, c) {
        acc = 16 * acc + c;
        return acc;
    }, 0);
}

// 根据顺序获取位置
function hex2x(index) {
    tmp_x = hexIndex;
    tmp_x += parseInt(index/16) + parseInt(index/2)+index;
    return tmp_x;
}

function ascii2x(index) {
    tmp_x = asciiIndex;
    tmp_x += parseInt(index/8)+index;
    return tmp_x;
}

function getXY(index) {
    x = index % 32;
    y = parseInt(index / 32);
    return {x:x, y:y}
}

// 根据位置变更16进制内容
function changeByte(index, keychar) {
    hexDataArr[index] = keychar;
    y = parseInt(index/32);
    addr = (startAddr+y*0x10).toString(16).padStart(16, "0");
    data = "";
    for(var j=y*32;j<y*32+32;j++) {
        data += hexDataArr[j];
    }
    clearLine(ctx, y-mouseWheelIndex);
    fillLine(ctx, y-mouseWheelIndex, addr, data);
}

// 获取鼠标相对于canvas位置
function getPointOnCanvas(canvas, x, y) {
    var bbox = canvas.getBoundingClientRect();
    return { x: x - bbox.left * (canvas.width  / bbox.width),
                y: y - 20 * (canvas.height / bbox.height)};
}

// 获取canvas位置所在字符的index
function getIndexFromXY(x, y) {
    // 先确认行
    row = parseInt((y-start_y+cellSizeY) / cellSizeY);
    row += mouseWheelIndex;
    if(row < 0 | row >= hexDataArr.length/32)
        return -1;
    // 再确认列
    col = parseInt((x-start_x) / font_width);
    col = (col - hexIndex);
    col = col%3+ parseInt(col/3)*2;
    if(col > 16) col -= 1;
    if(col < 0 | col > 31)
        return -1;
    return row*32+col;
}

// 获取canvas位置所在字符的index - 扩展，拖到用
function getIndexFromXY_ext(x, y) {
    // 先确认行
    row = parseInt((y-start_y+cellSizeY) / cellSizeY);
    if(row < 0)
        return 0;
    if(row >= hexDataArr.length/32)
        return hexDataArr.length-1;
    // 再确认列
    col = parseInt((x-start_x) / font_width);
    col = (col - hexIndex);
    col = col%3+ parseInt(col/3)*2;
    if(col > 16) col -= 1;
    if(col < 0 | col > 31)
        return -1;
    return row*32+col;
}

// fill canvas ------------------------------------
function fillChar(ctx,x,y,char) {
    x = start_x + font_width*x;
    y = start_y + cellSizeY*y;
    ctx.fillText(char, x, y);
}

function fillAddr(ctx,y,addr) {
    ctx.fillStyle="blue";
    for(i=0;i<addr.length;i++){
        fillChar(ctx,i,y,addr.charAt(i));
    }
}

function fillGap(ctx,y) {
    fillChar(ctx,gapIndex,y,"|");
}

function fillHex(ctx,y,hex) {
    ctx.fillStyle="black";
    for(i=0;i<hex.length;i++){
        fillChar(ctx, hex2x(i), y, hex.charAt(i));
    }
}

function fillAscii(ctx,y,hex) {
    for(var i=0;i<hex.length/2;i++){
        content = ".";
        tmp_hex = hex.charAt(2*i)+hex.charAt(2*i+1);
        value = hex2int(tmp_hex);
        if(value > 0x20 & value < 0x80)
            content = String.fromCharCode(value);
        fillChar(ctx, ascii2x(i), y, content);
    }
}

function fillLine(ctx, y, addr, hex) {
    fillAddr(ctx, y, addr)
    fillHex(ctx, y, hex)
    fillGap(ctx, y)
    fillAscii(ctx, y, hex)
}

function clearLine(ctx, y) {
    y = start_y + cellSizeY*y;
    ctx.clearRect(0, y-cellSizeY, c.width, cellSizeY);
}

function fillData(ctx, startAddr1, hexData="") {
    clearAll(ctx);
    if(hexData != "") 
        hexDataArr = hexData.split("");
    startAddr = startAddr1;
    for(var i=0;i<parseInt(hexDataArr.length/32)+20;i++) {
        addr = startAddr+(i+mouseWheelIndex)*16;
        addr = addr.toString(16).padStart(16, "0");
        data = "";
        for(var j=(i+mouseWheelIndex)*32;j<(i+mouseWheelIndex)*32+32;j++) {
            if(j>=hexDataArr.length){
                data += " ";
            }
            else{
                data += hexDataArr[j];
            }
        }
        fillLine(ctx, i, addr, data);
    }
}

// cursor ------------------------------------------
function getXYAxis(index) {
    show_index = index - mouseWheelIndex*32
    x = getXY(show_index).x;
    y = getXY(show_index).y;
    x = hex2x(x);
    x = start_x + font_width*x;
    y = start_y + cellSizeY*y;
    return {x:x, y:y}
}

function drawCursor(ctx, index) {
    if(index == -1) {
        return;
    }
    if(last_cursor_index != index) {
        clearCursor(ctx, last_cursor_index);
        last_cursor_index = index;
    }
    ctx.fillStyle = "#46a";
    x = getXYAxis(index).x;
    y = getXYAxis(index).y;
    show_index = index - mouseWheelIndex*32;
    if(show_index < 0) {
        return;
    }
    if(hasCursor) {
        if(index >= Math.min(selectStart,selectEnd) & index <= Math.max(selectStart,selectEnd) & selectStart != selectEnd) {
            ctx.fillStyle = "#e0e0ff";
        }
        else{
            ctx.fillStyle = "#ffffff";
        }
        ctx.fillRect(x, y, font_width, -cellSizeY);
        hasCursor = 0;
    }
    else {
        ctx.fillRect(x, y, font_width, -cellSizeY);
        hasCursor = 1;
    }
}

function clearCursor(ctx, index) {
    x = getXYAxis(index).x;
    y = getXYAxis(index).y;
    ctx.clearRect(x, y, font_width, -cellSizeY);
}

function clearAll(ctx) {
    ctx.clearRect(0,0,800,800);
}

function drawSelect(ctx, startIndex, endIndex){
    if(startIndex == -1) {
        return;
    }
    ctx.fillStyle = "#e0e0ff";
    if(startIndex > endIndex) {
        tmp = endIndex;
        endIndex = startIndex;
        startIndex = tmp;
    }
    if(startIndex % 2 == 1) startIndex -= 1;
    if(endIndex % 2 == 0) endIndex += 1;
    startrow = parseInt(startIndex / 32);
    endrow   = parseInt(endIndex / 32);
    if(startrow-mouseWheelIndex<0) {
        startrow = mouseWheelIndex;
        startIndex = mouseWheelIndex*32;
    }
    x0 = getXYAxis(startIndex).x;
    y0 = getXYAxis(startIndex).y;
    x1 = getXYAxis(endIndex).x;
    y1 = getXYAxis(endIndex).y;
    // 只在一行的
    if(startrow == endrow) {
        clearAll(ctx);
        ctx.fillRect(x0, y0-cellSizeY, x1-x0+font_width, cellSizeY);
    }
    // 多行的
    if(startrow < endrow) {
        start_x0 = getXYAxis(0 + mouseWheelIndex*32).x;
        end_x0   = getXYAxis(31 + mouseWheelIndex*32).x;
        clearAll(ctx);
        // 第一行
        ctx.fillRect(x0, y0-cellSizeY, end_x0-x0+font_width, cellSizeY);
        // 中间的
        ctx.fillRect(start_x0, y0, end_x0-start_x0+font_width, y1-y0-cellSizeY);
        // 最后一行
        ctx.fillRect(start_x0, y1-cellSizeY, x1-start_x0+font_width, cellSizeY);
    }
}

// canvas ----------------------------------------
var c=document.getElementById("myCanvas");
var ctx=c.getContext("2d");
ctx.font = "15px Consolas";
ctx.textBaseline = "bottom";

var c_cursor = document.getElementById("cursor");
var ctx_cursor = c_cursor.getContext("2d");

// 时间循环
setInterval(function(){
    if(cursor_index > -1) {
        drawCursor(ctx_cursor, cursor_index);
    }
}, 600)


// keyboard -------------------------------------
window.addEventListener('keydown', doKeyDown, true);
window.addEventListener('keyup',   doKeyUp, true);
function doKeyUp(e) {
    keyDown = 0;
}
function doKeyDown(e) {
    var keyID = e.keyCode ? e.keyCode :e.which;
    if(keyID == 13) { // enter
        var input_malloc = document.getElementById('malloc_size');
        var input_calloc = document.getElementById('calloc_size');
        var input_free   = document.getElementById('free_addr');
        if (input_malloc == document.activeElement) {
            $("#malloc_btn").click();
        } 
        else if(input_calloc == document.activeElement) {
            $("#calloc_btn").click();
        }
        else if(input_free == document.activeElement) {
            $("#free_btn").click();
        }
        return false;
    }
    // ctrl+c
    if (e.ctrlKey && keyID == 67){ 
        if(selectStart != -1) {
            var copy_str = heap_mem.substr(selectStart, selectEnd-selectStart+1);
            copyToClip(copy_str);
            return false;
        }
    }
    if(cursor_index < 0) return;
    // if(!mouseIn) return; // 鼠标在hex显示中
    needKeyBoardIDs = ['malloc_size','calloc_size','free_addr'];
    for(var i=0; i<needKeyBoardIDs.length; i++) {
        if(document.activeElement == document.getElementById(needKeyBoardIDs[i])) {
            return true;
        }
    }
    var is0_9a_f = 0;
    var keychar = "";
    // 上下左右
    if(keyID >= 37 & keyID <= 40) {
        if(keyID === 38)  { // up arrow
            cursor_index -= 32;
            if(cursor_index < 0) cursor_index += 32;
            if(cursor_index-mouseWheelIndex*32<=0) {
                mouseWheelIndex -= 1;
                fillData(ctx, heap_base);
                clearAll(ctx_cursor);
                drawCursor(ctx_cursor, cursor_index);
                drawSelect(ctx_cursor, selectStart, selectEnd);
            }
        }
        if(keyID === 40)  { // down arrow
            cursor_index += 32;
            if(cursor_index >= hexDataArr.length) cursor_index -= 32;
            if(cursor_index-mouseWheelIndex*32>32*32) {
                mouseWheelIndex += 1;
                fillData(ctx, heap_base);
                clearAll(ctx_cursor);
                drawCursor(ctx_cursor, cursor_index);
                drawSelect(ctx_cursor, selectStart, selectEnd);
            }
        }
        if(keyID === 39)  { // right arrow
            cursor_index += 1;
            if(cursor_index-mouseWheelIndex*32>32*32) { // 右移后退一行
                mouseWheelIndex += 1;
                fillData(ctx, heap_base);
                clearAll(ctx_cursor);
                drawCursor(ctx_cursor, cursor_index);
                drawSelect(ctx_cursor, selectStart, selectEnd);
            }
        }
        if(keyID === 37)  { // left arrow
            cursor_index -= 1;
            if(cursor_index>0 & cursor_index-mouseWheelIndex*32<0) { // 左移前进一行
                mouseWheelIndex -= 1;
                fillData(ctx, heap_base);
                clearAll(ctx_cursor);
                drawCursor(ctx_cursor, cursor_index);
                drawSelect(ctx_cursor, selectStart, selectEnd);
            }
        }
    }
    // 0-9
    else if(keyID >= 48 & keyID <= 57) {
        keychar = String.fromCharCode(keyID);
        //changeByte(cursor_index, keychar);
        is0_9a_f = 1;
    }
    else if(keyID >= 96 & keyID <= 105) {
        keychar = String.fromCharCode(keyID-48);
        //changeByte(cursor_index, keychar);
        is0_9a_f = 1;
    }
    // a-f
    else if(keyID >= 65 & keyID <= 70) {
        keychar = String.fromCharCode(keyID+32);
        //changeByte(cursor_index, keychar);  
        is0_9a_f = 1;       
    }
    else {
        return;
    }
    if(cursor_index < 0) cursor_index = 0;
    if(cursor_index >= hexDataArr.length) cursor_index = hexDataArr.length-1;
    if(is0_9a_f) {
        if(keyDown == 0) { // 第一次按下有效，一直按着只改第一次
            drawCursor(ctx_cursor, cursor_index);
            changeByte(cursor_index, keychar);  
            drawSelect(ctx_cursor, selectStart, selectEnd);
            // 更新edit步骤
            // 计算所在的8位 / 16个字符
            edit_step(cursor_index);
            cursor_index += 1;
            keyDown = 1;
        }
        else {
            e.returnValue=false;
            return;
        }
    }
    drawCursor(ctx_cursor, cursor_index);
    e.returnValue=false;
}
        
// mouse ----------------------------------------
c.addEventListener("mousedown", doMouseDown, false);
c.addEventListener('mousemove', doMouseMove, false);
c.addEventListener('mouseup',   doMouseUp, false);
c.addEventListener('mouseenter', function() { mouseIn = true;  })
c.addEventListener('mouseleave', function() { mouseIn = false; })
c.addEventListener("mousewheel", doMouseWheel, false);     // IE9, Chrome, Safari, Opera
c.addEventListener("DOMMouseScroll", doMouseWheel, false); // Firefox  
function doMouseDown(event) {
    mouseDown = 1;
    var x = event.pageX;
    var y = event.pageY;
    var loc = getPointOnCanvas(c, x, y);
    selectStart = getIndexFromXY(loc.x, loc.y);
    selectEnd = selectStart;
    cursor_index = selectStart;
    clearAll(ctx_cursor);
    drawCursor(ctx_cursor, cursor_index);
}
function doMouseUp(event) {
    mouseDown = 0;
    var x = event.pageX;
    var y = event.pageY;
    var loc = getPointOnCanvas(c, x, y);
}
function doMouseMove(event) {
    if(mouseDown != 1) return;
    var x = event.pageX;
    var y = event.pageY;
    var loc = getPointOnCanvas(c, x, y);
    selectEnd = getIndexFromXY(loc.x, loc.y);
    drawSelect(ctx_cursor, selectStart, selectEnd);
}
function doMouseWheel(event) {
    event.preventDefault();
    if(event.deltaY < 0) { //鼠标滚轮向上
        if(mouseWheelIndex > 0) {
            mouseWheelIndex -= 1;
            fillData(ctx, heap_base);
            clearAll(ctx_cursor);
            drawCursor(ctx_cursor, cursor_index);
            drawSelect(ctx_cursor, selectStart, selectEnd);
        }
    } else {  //鼠标滚轮向下
        var lineNum = heap_mem.length/32;
        if(lineNum-mouseWheelIndex <= 20) {
            mouseWheelIndex = lineNum-20;
        }
        else {
            mouseWheelIndex += 1;
            fillData(ctx, heap_base);
            clearAll(ctx_cursor);
            drawCursor(ctx_cursor, cursor_index);
            drawSelect(ctx_cursor, selectStart, selectEnd);
        }
    }
}

// 初始化数据
function times2(str, num){ return new Array(num+1).join(str); }
heap_base = 0x603000;
heap_mem = times2("0", 0x14*32);
fillData(ctx, heap_base, heap_mem);