const lines={
 welcome:['嘿，灵感捕手！今天想做个什么有趣的东西？','欢迎来到我的小舞台！带着问题来，还是带着点子来？','你来啦！我正等人一起脑洞大开呢。','靠近一点也没关系，想聊代码还是旅行？','今日灵感接收站已上线！说说你的想法吧。'],
 return:['又见面啦！刚才的想法有新进展吗？','欢迎回来，我还在这里等你的新点子。','兜了一圈回来啦？有没有发现什么有趣的？','老朋友回来咯！这次我们聊点什么？'],
 bump:['哎呀，慢一点，我的滑板还没考驾照呢！','别横冲直撞呀，停下来陪我聊两句嘛。','差点被你撞出一个新点子！说来听听？','这位帅气的访客，给我留点转弯空间嘛。','碰个面就好，不用真的碰一下呀。','嘿，我在这儿呢！我的卷发都差点被撞直了。'],
};
export function createNpcReactions({random=Math.random}={}){
 const bags=new Map(),last=new Map();let visits=0,lastBump=-Infinity,lastContact=-Infinity,armed=true;
 function take(kind){
  let bag=bags.get(kind);
  if(!bag?.length){bag=[...lines[kind]];for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.at(-1)===last.get(kind))[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];bags.set(kind,bag);}
  const text=bag.pop();last.set(kind,text);return text;
 }
 return {
  greeting(){return take(visits++?'return':'welcome');},
  contact(now,busy=false){
   const fresh=armed&&now-lastBump>=9;lastContact=now;armed=false;
   if(!fresh||busy)return null;
   lastBump=now;return take('bump');
  },
  update(now,distance){if(now-lastContact>.5&&distance>.57)armed=true;},
 };
}
