"""
日志模块: 配置和管理日志输出
"""

import os
import logging
from datetime import datetime

# 创建日志目录
log_dir = os.path.join('data', "logs")
os.makedirs(log_dir, exist_ok=True)

# 定义颜色
class ColoredFormatter(logging.Formatter):
    """带颜色的日志格式化器"""
    
    # ANSI颜色代码
    COLORS = {
        'DEBUG': '\033[36m',    # 青色
        'INFO': '\033[32m',     # 绿色
        'WARNING': '\033[33m',  # 黄色
        'ERROR': '\033[31m',    # 红色
        'CRITICAL': '\033[35m', # 紫色
        'RESET': '\033[0m'      # 重置颜色
    }
    
    def format(self, record):
        # 获取原始消息
        message = super().format(record)
        # 添加颜色
        if record.levelname in self.COLORS:
            message = f"{self.COLORS[record.levelname]}{message}{self.COLORS['RESET']}"
        return message

# 配置日志格式
log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
date_format = "%Y-%m-%d %H:%M:%S"

# 创建日志文件路径
log_file = os.path.join(log_dir, f"app_{datetime.now().strftime('%Y%m%d')}.log")

# 创建文件处理器
file_handler = logging.FileHandler(log_file, encoding='utf-8')
file_handler.setFormatter(logging.Formatter(log_format, date_format))

# 创建控制台处理器
console_handler = logging.StreamHandler()
console_handler.setFormatter(ColoredFormatter(log_format, date_format))

# 配置根日志记录器
logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, console_handler]
)

# 创建日志记录器
logger = logging.getLogger("article_generator")

def get_logger(name=None):
    """
    获取指定名称的日志记录器
    
    Args:
        name (str, optional): 日志记录器名称
        
    Returns:
        logging.Logger: 日志记录器实例
    """
    if name:
        return logging.getLogger(f"article_generator.{name}")
    return logger 