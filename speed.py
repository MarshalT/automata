import math

def adjust_processing_time_by_speed(original_time: float, speed_value: float) -> float:
    # 如果 speed_value 为0或负数，保持原始运行时间不变
    if speed_value <= 0:
        return original_time

    # 计算 (speed_value + 1) 的以2为底的对数
    log_value = math.floor(math.log2(speed_value + 1))

    # 应用公式
    adjusted_time = original_time * (10 - log_value) / 10

    # 确保调整后的时间不小于原始时间的10%
    return max(original_time * 0.1, adjusted_time)

def seconds_to_hms(seconds: float) -> str:
    # 将秒转换为时分秒
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f"{hours}小时{minutes}分{seconds}秒"

# 示例用法
original_time = 500  # 原始时间（秒）
speed_value = 50      # 速度值

adjusted_time = adjust_processing_time_by_speed(original_time, speed_value)
adjusted_time_hms = seconds_to_hms(adjusted_time)

print(f"调整后的时间为: {adjusted_time} 秒")
print(f"调整后的时间为: {adjusted_time_hms}")
