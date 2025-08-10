import { app } from "../../../scripts/app.js";


function normalize_node_name(node_name) {
	if (!node_name) return '';
  
	let text = String(node_name).normalize('NFKC');
  
	// 替换加减乘除为英文
	const symbolMap = {
	  '+': 'plus',
	  '*': 'times',
	  '×': 'times',
	  '/': 'div',
	  '÷': 'div',
	};
  
	for (const [symbol, replacement] of Object.entries(symbolMap)) {
	  const escapedSymbol = symbol.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
	  const regex = new RegExp(escapedSymbol, 'g');
	  text = text.replace(regex, replacement);
	}
  
	// 将所有非字母数字（包括空格、标点等）替换为 `-`
	text = text.replace(/[^a-zA-Z0-9]+/g, '-');
  
	// 去除首尾和重复的连字符
	text = text.replace(/-+/g, '-').replace(/^-|-$/g, '');
  
	return text;
}

/** 根据 python_module 和节点名构建 URL */
function buildNodeUrl(python_module, nodeName) {
	if (!python_module || !nodeName) return null;
	
	let category = '';
	
	if (python_module === "nodes") {
		category = "nodes";
	} else if (python_module.startsWith("comfy_extras.")) {
		category = "extra_nodes";
	} else if (python_module.startsWith("custom_nodes.")) {
		const parts = python_module.split(".");
		if (parts.length >= 2) {
			category = parts[1]; // 取第二个部分作为仓库名
		} else {
			category = "custom_nodes";
		}
	} else if (python_module.startsWith("comfy_api_nodes.")) {
		category = "nodes_api";
	} else {
		return null;
	}
	
	const slug = normalize_node_name(nodeName);
	
	return `https://uinodes.com/plugins/${category}/${slug}`;
}

  
// 部分代码参考kjnodes https://github.com/kijai/ComfyUI-KJNodes
app.registerExtension({
	name: "fsy.Link2uinodesCOM",
	async beforeRegisterNodeDef(nodeType, nodeData) {
		const cnt = 0;
		try {
			addLinkIcon(nodeData, nodeType);
			cnt++;
			if (cnt == 1) {
				console.log("nodeData", nodeData);
				console.log("nodeType", nodeType);
			}
		} catch (error) {
			console.error("Error in registering fsy.Link2uinodesCOM", error);
		}
	},

});


/** 计算图标位置 */
function getIconPosition(nodeSize, iconSize, iconMargin, position) {
	const positions = {
		'left_of_help': {
			x: nodeSize[0] - iconSize - iconMargin - 18 - 5,
			y: iconSize - 34
		},
		'top_right': {
			x: nodeSize[0] - iconSize - iconMargin,
			y: iconSize - 34 - 20
		},
		'top_left': {
			x: iconMargin,
			y: iconSize - 34
		}
	};
	
	return positions[position] || positions['left_of_help'];
}

/** 为节点添加链接图标 */
export const addLinkIcon = (
	nodeData,
	nodeType,
	opts = { icon_size: 14, icon_margin: 4 }
) => {
	opts = opts || {}
	const iconSize = opts.icon_size ? opts.icon_size : 14
	const iconMargin = opts.icon_margin ? opts.icon_margin : 4
	
	const drawFg = nodeType.prototype.onDrawForeground
	nodeType.prototype.onDrawForeground = function (ctx) {
		const r = drawFg ? drawFg.apply(this, arguments) : undefined
		if (this.flags.collapsed) return r

		// 获取图标位置
		const position = app.ui.settings.getSettingValue("fsy.Link2uinodesCOM") || 'left_of_help';
		const iconPos = getIconPosition(this.size, iconSize, iconMargin, position);
		
		// 绘制链接图标
		ctx.save()
		ctx.translate(iconPos.x - 2, iconPos.y)
		ctx.scale(iconSize / 32, iconSize / 32)
		ctx.strokeStyle = 'rgba(255,255,255,0.3)'
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.lineWidth = 2.4
		ctx.font = 'bold 36px monospace'
		ctx.fillStyle = '#4A9EFF'; // 蓝色链接图标
		ctx.fillText('🔗', 0, 24) // 使用链接emoji
		ctx.restore()
		
		return r
	}

	// 处理点击事件
	const mouseDown = nodeType.prototype.onMouseDown
	nodeType.prototype.onMouseDown = function (e, localPos, canvas) {
		const r = mouseDown ? mouseDown.apply(this, arguments) : undefined
		
		// 获取图标位置
		const position = app.ui.settings.getSettingValue("fsy.Link2uinodesCOM") || 'left_of_help';
		const iconPos = getIconPosition(this.size, iconSize, iconMargin, position);
		
		// 检查是否点击了链接图标
		if (
			localPos[0] > iconPos.x &&
			localPos[0] < iconPos.x + iconSize &&
			localPos[1] > iconPos.y &&
			localPos[1] < iconPos.y + iconSize
		) {

			// 构建 URL 链接
			const url = buildNodeUrl(nodeData.python_module, nodeData.name);
			// console.log("构建的URL:", url);
			
			// 打开链接前确认
			if (url) {
				const confirmed = confirm(`是否要打开以下链接？\n\n${url}\n\n点击"确定"将在新标签页中打开此链接。`);
				if (confirmed) {
					window.open(url, '_blank');
				}
			}
			
			return true; // 阻止事件继续传播
		}
		
		return r;
	}

	// 添加悬停提示
	const onMouseMove = nodeType.prototype.onMouseMove
	nodeType.prototype.onMouseMove = function (e, localPos, canvas) {
		const r = onMouseMove ? onMouseMove.apply(this, arguments) : undefined;
		
		const position = app.ui.settings.getSettingValue("fsy.Link2uinodesCOM") || 'left_of_help';
		const iconPos = getIconPosition(this.size, iconSize, iconMargin, position);
		
		// 检查鼠标是否悬停在链接图标上
		if (
			localPos[0] > iconPos.x &&
			localPos[0] < iconPos.x + iconSize &&
			localPos[1] > iconPos.y &&
			localPos[1] < iconPos.y + iconSize
		) {
			// 设置鼠标样式为指针
			canvas.canvas.style.cursor = 'pointer';
			
			// 构建URL并设置悬停提示
			const url = buildNodeUrl(nodeData.python_module, nodeData.name);
			if (url) {
				canvas.canvas.title = `即将打开 ${url}`;
			}
			
		} else {
			// 移除悬停提示
			canvas.canvas.title = '';
		}
		
		return r;
	}


	/* 
	updated: 2025-08-10
	description: 标题过大无法触发点击，添加右键菜单事件进行网站导航
	*/
	const original_getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
	nodeType.prototype.getExtraMenuOptions = function(_, options) {
        original_getExtraMenuOptions?.apply(this, arguments);
        options.push({
            content: "跳转uinodes.com查看文档",
            callback: async () => {
                const url = buildNodeUrl(nodeData.python_module, nodeData.name);
                if (url) {
                    const confirmed = confirm(`是否要打开以下链接？\n\n${url}\n\n点击"确定"将在新标签页中打开此链接。`);
                    if (confirmed) {
                        window.open(url, '_blank');
                    }
                }
            }
        })
    } 







} 