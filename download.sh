#!/bin/bash

set -e
set -u

# 进入build目录
cd build

# 获取 .ioc 文件的前缀
ioc_file=$(basename ../*.ioc .ioc)
hex_file="$ioc_file.hex"

# 检查 HEX 文件是否存在
if [ ! -f "$hex_file" ]; then
    echo "Error: HEX file $hex_file not found!"
    exit 1
fi

# 烧录
openocd -f interface/cmsis-dap.cfg -f target/stm32f4x.cfg -c "program $hex_file verify reset exit"