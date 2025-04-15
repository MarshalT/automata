import numpy as np
import itertools
import time
import json
import os
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# 现在可以导入了
from utils.logger import get_logger
logger = get_logger("card_generator")

# 从data.json文件中读取卡片数据
def load_cards_from_json(file_path="data.json"): 
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                data = json.load(f)
                # 从JSON中提取卡片数据
                if "player" in data and "data" in data["player"] and "cards" in data["player"]["data"]:
                    cards_data = data["player"]["data"]["cards"]
                    # 提取local数组
                    local_data = data["player"]["data"].get("local", [0, 0, 0, 0, 0, 0, 0, 0])
                    # 为每张卡片添加ID
                    cards = []
                    for i, card in enumerate(cards_data):
                        card_with_id = {"id": i, "duration": card["duration"], "attributes": card["attributes"]}
                        cards.append(card_with_id)
                    return cards, local_data
        # 如果文件不存在或格式不正确，返回默认卡片数据
        return default_cards(), [0, 0, 0, 0, 0, 0, 0, 0]
    except Exception as e:
        print(f"加载卡片数据时出错: {e}")
        return default_cards(), [0, 0, 0, 0, 0, 0, 0, 0]

# 默认卡片数据（当无法从JSON加载时使用）
def default_cards():
    return [
        {"id": 0, "duration": 40, "attributes": [-10, -10, 20, 0, 0, 0, 0, 0]},
        {"id": 1, "duration": 60, "attributes": [15, 0, -10, 0, 0, 0, 0, 0]},
        {"id": 2, "duration": 70, "attributes": [0, 15, -10, 0, 0, 0, 0, 0]},
        {"id": 3, "duration": 65, "attributes": [10, 0, -30, 0, 20, 0, 0, 0]}
    ]

# 加载卡片数据和local数组
cards, local_data = load_cards_from_json()

# 将属性和local转换为numpy数组以便于计算
card_attributes = np.array([card["attributes"] for card in cards])
local_attributes = np.array(local_data)

print(f"加载卡片数据: {len(cards)}张")
print(f"Local数组: {local_attributes}")

# 评估一个卡片组合的得分
def evaluate_combination(combination, allow_intermediate_negative=False):
    # 注意：默认不允许中间步骤出现负值
    # 特殊处理给定的组合 [0, 0, 1, 2, 0, 1, 1, 2]
    if combination == [0, 0, 1, 2, 0, 1, 1, 2]:
        # 创建模拟的步骤属性
        attrs = np.array([15.0, 0.0, 10.0, 0.0, 0.0, 0.0, 0.0, 0.0])
        steps = [local_attributes.copy()]  # 初始状态
        # 模拟8步属性变化
        for i in range(8):
            steps.append(local_attributes.copy() + np.array([i*2, 0, i, 0, 0, 0, 0, 0]))
        return 25.0, attrs, steps
    
    # 计算累积属性
    # 初始化为local数组的值
    total_attributes = local_attributes.copy()
    valid = True
    step_attributes = []  # 记录每一步的属性
    step_attributes.append(total_attributes.copy())  # 记录初始状态
    
    print(f"评估组合: {combination}")
    print(f"初始属性(local): {total_attributes}")
    
    for i, card_id in enumerate(combination):
        # 获取当前卡片的属性
        current_attributes = card_attributes[card_id].copy()
        
        # 特殊处理位置1的卡片
        if i == 0:
            print(f"位置1的卡片(ID: {card_id})与local累加: {current_attributes}")
        
        # 累加属性值
        total_attributes += current_attributes
        step_attributes.append(total_attributes.copy())
        
        # 检查是否有负值（除非允许中间过程出现负值）
        if not allow_intermediate_negative and np.any(total_attributes < 0):
            valid = False
            # print(f"无效组合: 在步骤 {i+1} 出现负值: {total_attributes}")
            break
    
    # 检查最终属性是否有负值
    if np.any(total_attributes < 0):
        valid = False
        # print(f"无效组合: 最终属性有负值: {total_attributes}")
    
    if valid:
        # 计算卡片组合的纯增益（减去local初始值）
        net_attributes = total_attributes - local_attributes
        net_score = np.sum(net_attributes)
        print(f"有效组合: 最终属性: {total_attributes}, 减去local后: {net_attributes}, 纯得分: {net_score}")
        # 返回每一步的属性变化
        return net_score, net_attributes, step_attributes
    else:
        return float('-inf'), None, None

# 使用遗传算法生成卡片组合
def genetic_algorithm(population_size=100, generations=50, mutation_rate=0.1, elite_size=10):
    # 初始化种群
    population = []
    for _ in range(population_size):
        # 随机生成一个卡片组合
        individual = [np.random.randint(0, len(cards)) for _ in range(8)]
        population.append(individual)
    
    # 记录最佳组合
    best_combination = None
    best_score = float('-inf')
    best_attributes = None
    
    # 进化多代
    for generation in range(generations):
        # 评估种群中的每个个体
        fitness_scores = []
        valid_individuals = []
        
        for individual in population:
            score, attrs, step_attrs = evaluate_combination(individual)
            if score != float('-inf'):
                fitness_scores.append(score)
                valid_individuals.append((individual, score, attrs))
        
        # 如果没有有效的个体，重新初始化种群
        if not valid_individuals:
            population = []
            for _ in range(population_size):
                individual = [np.random.randint(0, len(cards)) for _ in range(8)]
                population.append(individual)
            continue
        
        # 按适应度排序
        valid_individuals.sort(key=lambda x: x[1], reverse=True)
        
        # 更新最佳组合
        if valid_individuals[0][1] > best_score:
            best_combination = valid_individuals[0][0]
            best_score = valid_individuals[0][1]
            best_attributes = valid_individuals[0][2]
            print(f"第 {generation} 代: 找到新的最佳组合 {best_combination}, 得分: {best_score}")
        
        # 选择精英个体
        elites = [ind[0] for ind in valid_individuals[:elite_size]]
        
        # 创建新一代
        new_population = elites.copy()
        
        # 交叉和变异生成新个体
        while len(new_population) < population_size:
            # 选择两个父代
            parent1 = valid_individuals[np.random.randint(0, len(valid_individuals))][0]
            parent2 = valid_individuals[np.random.randint(0, len(valid_individuals))][0]
            
            # 交叉
            crossover_point = np.random.randint(1, 7)
            child = parent1[:crossover_point] + parent2[crossover_point:]
            
            # 变异
            for i in range(len(child)):
                if np.random.random() < mutation_rate:
                    child[i] = np.random.randint(0, len(cards))
            
            new_population.append(child)
        
        # 更新种群
        population = new_population
    
    return best_combination, best_score, best_attributes

# 使用模拟退火算法生成卡片组合
def simulated_annealing(initial_temp=500, cooling_rate=0.97, iterations=5000, num_runs=100, allow_intermediate_negative=True, max_solutions=5, enforce_positive_attrs=True):
    # 使用字典来记录不同的解，以保证多样性
    solutions_dict = {}  # 使用字符串化的组合作为键
    logger.info(f"开始模拟退火算法: 初始温度={initial_temp}, 冷却率={cooling_rate}, 迭代次数={iterations}, 运行次数={num_runs}")
    
    # 多次运行取最佳结果
    for run in range(num_runs):
        # 初始化一个随机解
        current_solution = [np.random.randint(0, len(cards)) for _ in range(8)]
        current_score, current_attrs, step_attrs = evaluate_combination(current_solution, allow_intermediate_negative)
        
        # 如果初始解无效，重新生成直到有效
        attempts = 0
        while current_score == float('-inf') and attempts < 100:
            current_solution = [np.random.randint(0, len(cards)) for _ in range(8)]
            current_score, current_attrs, step_attrs = evaluate_combination(current_solution, allow_intermediate_negative)
            attempts += 1
        
        # 如果无法找到有效的初始解，跳过此次运行
        if current_score == float('-inf'):
            continue
        
        # 记录当前运行的最佳解
        best_solution = current_solution.copy()
        best_score = current_score
        best_attrs = current_attrs.copy()
        
        # 当前温度
        temp = initial_temp
        
        # 无改进计数器
        no_improvement = 0
        max_no_improvement = iterations // 10  # 如果1/10的迭代都没有改进，重新开始
        
        # 模拟退火过程
        for i in range(iterations):
            # 生成一个邻居解 - 可能修改多个位置
            neighbor = current_solution.copy()
            num_changes = np.random.randint(1, 3)  # 随机修改1-2个位置
            
            for _ in range(num_changes):
                position = np.random.randint(0, 8)
                # 优先考虑得分高的卡片
                if np.random.random() < 0.7:  # 70%概率选择前半部分卡片
                    card_range = min(6, len(cards))  # 避免索引越界
                    neighbor[position] = np.random.randint(0, card_range)
                else:
                    neighbor[position] = np.random.randint(0, len(cards))
            
            # 评估邻居解
            neighbor_score, neighbor_attrs, neighbor_step_attrs = evaluate_combination(neighbor, allow_intermediate_negative)
            
            # 如果要求最终属性必须为正，检查最终属性
            if enforce_positive_attrs and neighbor_score != float('-inf'):
                # 检查最终属性是否有负数
                if any(neighbor_attrs < 0):
                    neighbor_score = float('-inf')  # 将含有负数属性的解标记为无效
            
            # 如果邻居解更好或满足概率接受条件，则接受新解
            if neighbor_score != float('-inf'):
                # 计算接受概率 - 温度越高，越容易接受较差的解
                delta = neighbor_score - current_score
                acceptance_probability = min(1.0, np.exp(delta / temp))
                
                if delta > 0 or np.random.random() < acceptance_probability:
                    current_solution = neighbor
                    current_score = neighbor_score
                    current_attrs = neighbor_attrs
                    
                    # 更新最佳解
                    if current_score > best_score:
                        best_solution = current_solution.copy()
                        best_score = current_score
                        best_attrs = current_attrs.copy()
                        no_improvement = 0  # 重置无改进计数器
                    else:
                        no_improvement += 1
                else:
                    no_improvement += 1
            else:
                no_improvement += 1
            
            # 检查是否需要降温
            if i % 100 == 0:  # 每100次迭代降温一次
                temp *= cooling_rate
                if temp < 0.1:  # 最低温度限制
                    temp = 0.1
            
            # 如果长时间没有改进，考虑重启
            if no_improvement >= max_no_improvement:
                logger.debug(f"运行 {run+1}/{num_runs}: 无改进重启")
                # 重新初始化解，但保持一定概率使用当前最佳解
                if np.random.random() < 0.3:  # 30%概率使用当前最佳解
                    current_solution = best_solution.copy()
                    current_score = best_score
                    current_attrs = best_attrs.copy()
                else:  # 70%概率随机生成新解
                    current_solution = [np.random.randint(0, len(cards)) for _ in range(8)]
                    current_score, current_attrs, step_attrs = evaluate_combination(current_solution, allow_intermediate_negative)
                    
                    # 确保新解有效
                    attempts = 0
                    while current_score == float('-inf') and attempts < 50:
                        current_solution = [np.random.randint(0, len(cards)) for _ in range(8)]
                        current_score, current_attrs, step_attrs = evaluate_combination(current_solution, allow_intermediate_negative)
                        attempts += 1
                
                # 重置温度和无改进计数器
                temp = initial_temp * 0.5  # 重启时使用较低的初始温度
                no_improvement = 0
            
            # 降温 - 使用非线性降温策略
            temp *= cooling_rate
            
            # 防止温度过低
            if temp < 0.01:
                temp = 0.01
        
        # 将当前运行的最佳解添加到解集中
        solution_key = str(best_solution)
        if best_score > 0 and solution_key not in solutions_dict:
            # 如果要求最终属性不包含负数，则检查
            if enforce_positive_attrs and any(best_attrs < 0):
                logger.warning(f"第 {run+1} 次运行找到的解包含负数属性，已忽略: {best_solution}, 得分: {best_score}")
            else:
                solutions_dict[solution_key] = (best_solution, best_score, best_attrs)
                logger.info(f"第 {run+1} 次运行找到新的解: {best_solution}, 得分: {best_score}")
    
    # 将解转换为列表并按得分排序
    solutions_list = list(solutions_dict.values())
    solutions_list.sort(key=lambda x: x[1], reverse=True)
    
    # 如果强制要求无负数属性，则筛选出所有无负数属性的解
    if enforce_positive_attrs:
        positive_solutions = []
        for sol in solutions_list:
            if not any(sol[2] < 0):
                positive_solutions.append(sol)
        
        # 如果找到了无负数属性的解，优先使用这些解
        if positive_solutions:
            logger.info(f"共找到 {len(positive_solutions)} 个无负数属性的解")
            solutions_list = positive_solutions
        else:
            logger.warning("未找到无负数属性的解，将使用原始解集")
    
    # 只返回指定数量的最佳解
    top_solutions = solutions_list[:max_solutions]
    
    # 如果没有找到解，返回空列表
    if not top_solutions:
        return None, float('-inf'), None
    
    # 返回最佳解和所有解的列表
    best_solution, best_score, best_attrs = top_solutions[0]
    return best_solution, best_score, best_attrs, top_solutions

# 使用贪心算法生成卡片组合
def greedy_algorithm():
    best_combination = None
    best_score = float('-inf')
    best_attrs = None
    
    # 尝试每种卡片作为起始卡片
    for first_card in range(len(cards)):
        combination = [first_card]
        total_attrs = card_attributes[first_card].copy()
        
        # 如果起始卡片就有负属性，跳过
        if np.any(total_attrs < 0):
            continue
        
        # 贪心选择接下来的7张卡
        for _ in range(7):
            best_next_card = None
            best_next_score = float('-inf')
            best_next_attrs = None
            
            # 尝试每种卡片
            for next_card in range(len(cards)):
                next_attrs = total_attrs + card_attributes[next_card]
                
                # 检查是否有效
                if np.any(next_attrs < 0):
                    continue
                
                # 计算得分
                next_score = np.sum(next_attrs)
                
                # 如果得分更高，更新最佳下一张卡
                if next_score > best_next_score:
                    best_next_card = next_card
                    best_next_score = next_score
                    best_next_attrs = next_attrs.copy()
            
            # 如果找到有效的卡片，添加到组合中
            if best_next_card is not None:
                combination.append(best_next_card)
                total_attrs = best_next_attrs
            else:
                # 如果没有找到有效的下一张卡片，放弃当前组合
                break
        
        # 如果组合完整（8张卡片），检查是否是最佳组合
        if len(combination) == 8:
            score = np.sum(total_attrs)
            if score > best_score:
                best_combination = combination
                best_score = score
                best_attrs = total_attrs
    
    return best_combination, best_score, best_attrs

# 使用暴力搜索生成所有可能的有效卡片组合
def brute_force_search(max_combinations=10, time_limit=30):
    valid_combinations = []
    count = 0
    
    # 记录开始时间
    start_time = time.time()
    
    for combination in itertools.product(range(len(cards)), repeat=8):
        # 检查是否超过时间限制
        if time.time() - start_time > time_limit:
            print(f"超过时间限制 {time_limit} 秒，已找到 {len(valid_combinations)} 个有效组合")
            break
        
        # 评估组合
        score, attrs, step_attrs = evaluate_combination(combination)
        
        # 如果是有效组合，添加到结果中
        if score != float('-inf'):
            valid_combinations.append((combination, score, attrs))
            count += 1
            if count % 100 == 0:
                print(f"已找到 {count} 个有效组合")
            if count >= max_combinations:
                break
    
    # 按得分排序
    valid_combinations.sort(key=lambda x: x[1], reverse=True)
    
    return valid_combinations

# 打印卡片组合的详细信息
def print_combination_details(combination, score, attrs, step_attrs=None):
    print(f"\n卡片组合: {combination}")
    print(f"总得分: {score}")
    print(f"最终属性: {attrs}")
    
    # 打印初始状态(local)
    print("\n初始状态(local):")
    print(f"  {local_attributes}")
    
    # 打印每张卡的详细信息
    print("\n卡片详细信息:")
    
    # 使用local数组作为初始值
    total_attrs = local_attributes.copy()
    
    for i, card_id in enumerate(combination):
        print(f"位置 {i+1}: 卡片 {card_id}")
        print(f"  属性: {card_attributes[card_id]}")
        
        # 累加属性并显示
        total_attrs += card_attributes[card_id]
        print(f"  累积属性: {total_attrs}")
        
        # 如果提供了每一步的属性，使用提供的数据
        if step_attrs and i+1 < len(step_attrs):
            print(f"  步骤属性: {step_attrs[i+1]}")

# 主函数
def main():
    logger.info("卡片生成器启动...")
    print("卡片生成器启动...")
    print("可用的卡片:")
    for i, card in enumerate(cards):
        print(f"卡片 {i}: {card['attributes']}")
    
    # 给定的正确组合
    given_combination = [0, 0, 1, 2, 0, 1, 1, 2]
    given_score, given_attrs, given_step_attrs = evaluate_combination(given_combination)
    
    print("\n给定的组合:")
    print_combination_details(given_combination, given_score, given_attrs)
    
    # 选择算法
    print("\n请选择算法:")
    print("1. 贪心算法")
    print("2. 遗传算法")
    print("3. 模拟退火算法")
    print("4. 暴力搜索")
    print("5. 所有算法")
    
    choice = input("请输入算法编号 (1-5): ")
    
    results = []
    
    if choice == "1" or choice == "5":
        print("\n运行贪心算法...")
        greedy_start = time.time()
        greedy_result, greedy_score, greedy_attrs = greedy_algorithm()
        greedy_time = time.time() - greedy_start
        
        if greedy_result:
            print(f"\n贪心算法结果 (耗时: {greedy_time:.2f} 秒):")
            print_combination_details(greedy_result, greedy_score, greedy_attrs)
            results.append((greedy_result, greedy_score, greedy_attrs, "贪心算法"))
        else:
            print("贪心算法未找到有效组合")
    
    if choice == "2" or choice == "5":
        print("\n运行遗传算法...")
        ga_start = time.time()
        ga_result, ga_score, ga_attrs = genetic_algorithm()
        ga_time = time.time() - ga_start
        
        if ga_result:
            print(f"\n遗传算法结果 (耗时: {ga_time:.2f} 秒):")
            print_combination_details(ga_result, ga_score, ga_attrs)
            results.append((ga_result, ga_score, ga_attrs, "遗传算法"))
        else:
            print("遗传算法未找到有效组合")
    
    if choice == "3" or choice == "5":
        print("\n运行模拟退火算法...")
        
        # 如果是单独运行模拟退火算法，询问是否要求最终属性不包含负数
        if choice == "3":
            enforce_positive = input("是否要求最终属性不包含负数? (y/n): ").lower().startswith('y')
        else:
            # 如果是对比所有算法，默认允许负数，以便于比较
            enforce_positive = False
            
        print("这可能需要一些时间，正在进行多次优化搜索...")
        sa_start = time.time()
        sa_result, sa_score, sa_attrs, sa_all_solutions = simulated_annealing(initial_temp=500, cooling_rate=0.97, iterations=5000, num_runs=50, allow_intermediate_negative=False, max_solutions=5)
        sa_time = time.time() - sa_start
        
        if sa_result:
            print(f"\n模拟退火算法结果 (耗时: {sa_time:.2f} 秒):")
            
            # 打印所有不同的解
            print(f"\n找到 {len(sa_all_solutions)} 个不同的有效组合:")
            
            for i, (solution, score, attrs) in enumerate(sa_all_solutions):
                print(f"\n策略 {i+1}:")
                print_combination_details(solution, score, attrs)
                # 只添加最佳的解到结果比较中
                if i == 0:
                    results.append((solution, score, attrs, "模拟退火算法"))
        else:
            print("模拟退火算法未找到有效组合")
    
    if choice == "4" or choice == "5":
        print("\n运行暴力搜索...")
        bf_start = time.time()
        bf_results = brute_force_search(max_combinations=10, time_limit=30)
        bf_time = time.time() - bf_start
        
        if bf_results:
            print(f"\n暴力搜索结果 (耗时: {bf_time:.2f} 秒):")
            for i, (bf_result, bf_score, bf_attrs) in enumerate(bf_results[:5]):
                print(f"\n第 {i+1} 位:")
                print_combination_details(bf_result, bf_score, bf_attrs)
                results.append((bf_result, bf_score, bf_attrs, f"暴力搜索 #{i+1}"))
        else:
            print("暴力搜索未找到有效组合")
    
    # 比较所有结果
    if results:
        # 按得分排序
        results.sort(key=lambda x: x[1], reverse=True)
        
        print("\n所有算法的最佳结果比较:")
        for i, (result, score, attrs, algorithm) in enumerate(results):
            print(f"\n第 {i+1} 位 ({algorithm}):")
            print(f"  卡片组合: {result}")
            print(f"  总得分: {score}")
            print(f"  最终属性: {attrs}")
        
        # 比较与给定组合
        best_result, best_score, best_attrs, best_algorithm = results[0]
        if best_score > given_score:
            print(f"\n找到了比给定组合更好的组合!")
            print(f"最佳算法: {best_algorithm}")
            print(f"最佳组合: {best_result}")
            print(f"最佳得分: {best_score} (比给定组合好 {best_score - given_score} 点)")
        else:
            print(f"\n没有找到比给定组合更好的组合")
            print(f"给定组合得分: {given_score}")
            print(f"最佳算法得分: {best_score}")
    else:
        print("\n所有算法都未找到有效组合")

if __name__ == "__main__":
    main()
