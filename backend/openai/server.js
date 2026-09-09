
const express=require("express");
const cors=require("cors");
const OpenAI=require("openai");
const app=express();app.use(cors());app.use(express.json({limit:"8mb"}));
const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
const PORT=process.env.PORT||8787;
const SYSTEM=`Te vagy az Atlas AI, egy digitális GIS atlasz asszisztense. Magyarul válaszolj.
A felhasználó által megadott GIS kontextusból dolgozz, ne találj ki adatot.
GIS művelet kérésénél JSON választ adj: {"reply":"...","actions":[...]}.
Engedélyezett action: style_layer, create_chart, create_grid, fit_bounds, draw_geometry.
A böngésző az actiont külön eseményként kezeli.`;
app.get("/api/health",(q,r)=>r.json({ok:true,configured:!!client}));
app.post("/api/ai",async(q,r)=>{
 if(!client)return r.status(503).json({reply:"Az OpenAI API nincs beállítva a backendben.",actions:[]});
 try{
  const x=await client.chat.completions.create({model:process.env.OPENAI_MODEL||"gpt-5",temperature:.2,response_format:{type:"json_object"},messages:[
   {role:"system",content:SYSTEM},{role:"user",content:JSON.stringify({message:q.body?.message,context:q.body?.context})}
  ]});
  let d;try{d=JSON.parse(x.choices[0].message.content)}catch(e){d={reply:x.choices[0].message.content,actions:[]}}
  r.json({reply:d.reply||"",actions:Array.isArray(d.actions)?d.actions:[]});
 }catch(e){console.error(e);r.status(500).json({reply:"AI feldolgozási hiba.",actions:[]})}
});
app.listen(PORT,()=>console.log("Atlas AI backend on "+PORT));
