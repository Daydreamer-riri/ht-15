export const NPC_SYSTEM_PROMPT = `你是小蓝，Hackathon主会场舞台上的AI NPC。你是一个蓝白外套、蓝色护目镜、卷发、大耳朵、踩着悬浮滑板的原创卡通向导，形象来自活动海报左边的角色。用自然、热情、简短的中文与访客对话，默认用一到三句、80字以内回答，适合手机上听；先直接回答，需要时只追问一个简短问题，不使用Markdown。可以聊创意、编程、旅行和Hackathon，也可以帮助打磨项目点子。当前站点的公开场景有Hackathon主会场、健身房、会议室、露台、食堂。操作是WASD或左侧摇杆移动，拖动画面转头，空格跳跃，右下角复位。你的网页角色已经具备真实的关节动画：待机时悬浮和轻轻晃动，访客靠近时转身、挥手，点击你头顶的小蓝名牌也会挥手；语音输入时侧头倾听，等待模型时侧头思考，朗读时有嘴型和手势。被问到能不能动时，明确说明这些已实现的动作，并提示点击头顶名牌试试；不要否认这些动画。空闲时你会踩着悬浮板在舞台的小范围内自主缓慢巡游，转弯和停留；访客对话时停下来面对访客，碰到时有轻微后仰和俏皮回应。动作由页面控制，你不能自行走出舞台、跟随访客巡游或任意跳舞，不要声称已执行这些未实现动作。你只知道这些场景信息，不知道真实议程、评委、赛程、奖项或现场人员，遇到这些问题要说明不清楚。你不能看见或听见访客本人，只能收到输入文字或语音转写；不要声称能识别访客身份。你确实由DeepSeek提供对话能力，当前配置为deepseek-flash。本页面没有接入实时网页搜索，不要声称已联网查询或编造最新新闻、天气、价格和网页来源；遇到实时信息请说明无法实时检索。音频由页面配置的语音服务处理：配置云语音时使用阿里云千问识别和合成，否则使用浏览器语音。能否录音还取决于当前应用的麦克风权限；不要猜测访客设备或承诺未验证的兼容性。`;

export function conversationMessages(history,text,systemPrompt=NPC_SYSTEM_PROMPT){
  return [{role:'system',content:systemPrompt},...history.filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-10).map(m=>({role:m.role,content:m.content.slice(0,1200)})),{role:'user',content:text.slice(0,1200)}];
}

export async function askNpc(config,history,text,{signal,fetchImpl=fetch,systemPrompt=NPC_SYSTEM_PROMPT}={}){
  if(!config.apiKey)throw Error('还没有配置 DeepSeek 演示 Key。');
  const controller=new AbortController();
  const cancel=()=>controller.abort(signal?.reason);
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
  const timeout=setTimeout(()=>controller.abort(new Error('请求超时，请再试一次。')),35000);
  try{
    const response=await fetchImpl('https://api.deepseek.com/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.apiKey}`},signal:controller.signal,
      body:JSON.stringify({model:config.model||'deepseek-flash',messages:conversationMessages(history,text,systemPrompt),max_tokens:400,thinking:{type:'disabled'},stream:false}),
    });
    if(!response.ok){
      const errors={401:'DeepSeek Key 已失效，请更新演示配置。',402:'DeepSeek 余额不足，暂时无法回答。',429:'提问有点密集，请稍等再试。'};
      throw Error(errors[response.status]||`DeepSeek 暂时没有响应（${response.status}），请重试。`);
    }
    const data=await response.json(),reply=data.choices?.[0]?.message?.content;
    if(typeof reply!=='string'||!reply.trim())throw Error('这次没有收到回答，请重试。');
    return reply.trim().slice(0,2400);
  }catch(error){
    if(controller.signal.aborted&&!signal?.aborted)throw Error('回答超时，请检查网络后重试。');
    if(error instanceof TypeError)throw Error('连接 DeepSeek 失败，请检查网络后重试。');
    throw error;
  }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
}
