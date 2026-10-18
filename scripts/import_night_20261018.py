from pathlib import Path
import json,hashlib
import argparse
a=argparse.ArgumentParser();a.add_argument('--source',type=Path,required=True);args=a.parse_args()
R=Path(__file__).resolve().parents[1];src=args.source;p=R/'dist/data/books.json';d=json.loads(p.read_text());d['books']=[b for b in d['books'] if not 20<=int(b['id'].split('-')[1])<=32]
newgroups=[('heritage-myth','中华遗产 · 神话文化','中华遗产神话文化','按编著方与主题归组，已藏册数不代表出版总数，也不表示购买套装。'),('asimov-short','阿西莫夫科幻短篇全集','阿西莫夫科幻短篇全集','按封面卷序排列，卷 1 与卷 2 分别建档；照片未标明的分册信息待核对。'),('y iwen-classics'.replace(' ',''),'译文经典','译文经典','上海译文出版社“译文经典”丛书归组，已藏册数不代表出版总数。'),('don-quixote','堂吉诃德 · 上下册','堂吉诃德上下册','上下册合为一组，各保留独立档案；全两册定价 68 元，仅累计一次。')]
for ident,title,short,desc in newgroups:
 if not any(g['id']==ident for g in d['seriesGroups']):d['seriesGroups'].append({'id':ident,'title':title,'shortTitle':short,'kind':'书系或分册归组','description':desc})
items=[
('中国妖鬼',None,'中华遗产',None,[],'湖南文艺出版社','978-7-5726-2786-6',98,'234219','234230','民俗与神话',['民俗神话','世界观参考','怪物设计'],'heritage-myth',1,None,'约八五成新','封底右下角有折痕，边缘有轻微磨损。'),
('中国神仙',None,'中华遗产',None,[],'湖南文艺出版社','978-7-5726-3129-0',98,'234246','234255','民俗与神话',['民俗神话','世界观参考','角色塑造'],'heritage-myth',2,None,'约八成新','封面、封底书角可见折压及磨损。'),
('游戏改变世界','游戏化如何让现实变得更美好','简·麦戈尼格尔','美国',['闾佳'],'北京联合出版公司','978-7-5502-8687-0',59.9,'234333','234340','游戏设计与研发',['玩法设计','用户体验','社会观察'],None,None,'经典版','约八成新','封面有使用痕迹，封底右上角有较明显折痕。'),
('阿西莫夫科幻短篇全集2','双百人','艾萨克·阿西莫夫','美国',['胡纾'],'江苏凤凰文艺出版社','978-7-5594-8565-6',119,'234445','234456_2','文学与小说',['叙事结构','角色塑造','世界观参考'],'asimov-short',2,None,'约八五成新','封面、封底有细划痕，边角有轻微磨损。'),
('剧本','影视写作的艺术、技巧和商业运作','理查德·沃尔特','美国',['杨劲桦'],'天津人民出版社','978-7-201-11518-4',58,'234516','234528','写作与叙事',['叙事结构','对白写作'],None,None,None,'约七五成新','封面、封底有斑点和使用痕迹，封底右上角有折压。'),
('对白','文字、舞台、银幕的言语行为艺术','罗伯特·麦基','美国',['焦雄屏'],'天津人民出版社','978-7-201-12682-1',68,'234549','234602','写作与叙事',['对白写作','角色塑造'],None,None,None,'约八成新','封面左上角与书脊上沿有折压，边缘有轻微磨损。'),
('故事','材质、结构、风格和银幕剧作的原理','罗伯特·麦基','美国',['周铁东'],'天津人民出版社','978-7-201-08833-4',68,'234714','234725','写作与叙事',['叙事结构','角色塑造'],None,None,None,'约八五成新','书脊及封底右上角有轻微折压，边缘有使用痕迹。'),
('堂吉诃德','上册','塞万提斯','西班牙',['杨绛'],'人民文学出版社','978-7-02-010276-1',None,'234800','234814','文学与小说',['角色塑造','叙事结构'],'don-quixote',1,None,'约八五成新','封面、封底边角有轻微磨损。'),
('阿西莫夫科幻短篇全集1','最后的问题','艾萨克·阿西莫夫','美国',['老光'],'江苏凤凰文艺出版社','978-7-5594-7868-9',119,'234858','234940','文学与小说',['叙事结构','世界观参考'],'asimov-short',1,'夜光珍藏版（腰封标识）','约八五成新','封面、封底整体完整，有轻微边角磨损，保留腰封。'),
('太阳照常升起',None,'海明威','美国',['赵静男'],'上海译文出版社','978-7-5327-8420-2',48,'234956','235004','文学与小说',['角色塑造','叙事结构'],'yiwen-classics',1,None,'约八五成新','封面、封底整体完整，书角和边缘有轻微使用痕迹。'),
('老人与海',None,'海明威','美国',['吴劳'],'上海译文出版社','978-7-5327-4798-6',36,'235017','235025','文学与小说',['角色塑造','叙事结构'],'yiwen-classics',2,None,'约八五成新','封面、封底整体完整，边角可见轻微磨损。'),
('生吞',None,'郑执',None,[],'浙江文艺出版社','978-7-5339-5005-7',49.8,'235039_1','235105','文学与小说',['叙事结构','角色塑造'],None,None,None,'约八成新','封面、封底和书角有使用痕迹，封面边缘有少量磨损。'),
('堂吉诃德','下册','塞万提斯','西班牙',['杨绛'],'人民文学出版社','978-7-02-010276-1',None,'235236','235245','文学与小说',['角色塑造','叙事结构'],'don-quixote',2,None,'约八五成新','封面、封底及书脊边角有轻微折压和磨损。')]
for n,row in enumerate(items,20):
 title,sub,author,country,trans,pub,isbn,price,front,back,cat,usage,group,num,edition,cond,note=row;ident=f'LC-{n:06}';photos=[];dest=R/'dist/assets'/ident;dest.mkdir(parents=True,exist_ok=True)
 for side,suffix in [('front',front),('back',back)]:
  fn=f'IMG_20261018_{suffix}.jpg';raw=(src/fn).read_bytes();out=dest/f'{side}-original.jpg';out.write_bytes(raw);t=suffix[:6];path=f'assets/{ident}/{out.name}'
  photos.append({'side':side,'label':'正面' if side=='front' else '背面','file':path,'original':path,'sourceFilename':fn,'capturedAt':f'2026-10-18T{t[:2]}:{t[2:4]}:{t[4:]}+08:00','timeSource':'文件名；照片水印核对至分钟','sha256':hashlib.sha256(raw).hexdigest()})
 b={'id':ident,'title':title,'subtitle':sub,'authors':[{'name':author,**({'country':country} if country else {}),'role':'编著' if author=='中华遗产' else '著'}],'translators':trans,'publisher':pub,'isbn':isbn,'category':cat,'tags':list(usage),'usageTags':usage,'language':'zh-Hans','languageLabel':'中文译本' if trans else '中文','series':next((g['title'] for g in d['seriesGroups'] if g['id']==group),None),'seriesGroupId':group,'seriesNumber':num,'seriesLabel':(('上册' if num==1 else '下册') if group=='don-quixote' else f'第{num}卷' if group=='asimov-short' else None),'purchaseGroupId':None,'orientation':'portrait','coverEditionLabel':edition,'publicationDate':None,'edition':None,'listPrice':price,'paidPrice':None,'currency':'CNY','purchaseDate':None,'purchaseDatePrecision':None,'purchaseChannel':None,'accessionedAt':photos[0]['capturedAt'],'accessionRule':'首张正面照片的拍摄时间','readingStatus':None,'location':None,'notes':None,'description':('《堂吉诃德》杨绛译本'+('上册' if num==1 else '下册')+'。上下册合为一组，定价为全两册合计。' if group=='don-quixote' else '依据自有实体书正反面照片录入；参考用途按书目主题作个人编目。'),'metadataSource':'自有实体书正反面照片；分类与用途标签为个人编目','photos':photos,'condition':{'label':cond,'note':note,'scope':'外观','source':'正反面照片预估','assessedOn':'2026-10-19','limitations':'未检查内页、装订牢固度、缺页、笔记及霉斑等情况。'}}
 if group=='don-quixote':b.update(priceGroupId='don-quixote-set',isbnScope='全套 ISBN，取自下册封底',physicalSetId='don-quixote-set')
 d['books'].append(b)
d['priceGroups']=[{'id':'don-quixote-set','label':'堂吉诃德（全两册）','amount':68,'currency':'CNY','bookIds':['LC-000027','LC-000032'],'source':'下册封底明确标示 68.00 元（全两册）'}]
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('Added',len(items),'physical books')
