// Type minimal pour vérifier la syntaxe TypeScript sur un poste sans Deno.
// Le contrôle définitif doit utiliser le compilateur et les types Deno du projet Atlas.
declare const Deno:{
  env:{get(name:string):string|undefined};
  serve(handler:(req:Request)=>Response|Promise<Response>):void;
};
