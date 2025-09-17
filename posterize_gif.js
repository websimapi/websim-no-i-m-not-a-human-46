export function applyPosterizeToGif(canvas, gifImg, bgImg, levels = 5.0, edgeMix = 0.12) {
  const gl = canvas.getContext('webgl'); if (!gl) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let raf = 0;
  const resize = ()=>{ const w=Math.floor(innerWidth*dpr), h=Math.floor(innerHeight*dpr);
    if(canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px'; } };
  const vs=`attribute vec2 p;attribute vec2 u;varying vec2 v;void main(){v=u;gl_Position=vec4(p,0.0,1.0);}`;
  const fs=`precision highp float;varying vec2 v;
uniform sampler2D texGif, texBg; uniform vec2 texel; uniform float lv, em, tm, fogC;
float luma(vec3 c){return dot(c,vec3(0.299,0.587,0.114));}
vec3 posterize(vec3 c,float L){return floor(c*L)/L;}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.99,78.23)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
void main(){
  float skyMask=smoothstep(fogC, fogC-0.5, v.y);
  vec2 mot=vec2(fbm(v*2.5+tm*0.08), fbm(v*2.5-tm*0.08));
  vec2 duv=v+(mot-0.5)*0.1*skyMask;
  vec4 g=texture2D(texGif, duv);
  vec3 bg=texture2D(texBg, duv).rgb;
  vec3 src=mix(bg, g.rgb, g.a);
  float dynLv=lv+mot.x*3.0*skyMask;
  vec3 col=pow(src, vec3(1.0/2.2));
  vec3 post=posterize(col, dynLv); post=pow(post, vec3(2.2));
  float tl=luma(texture2D(texGif, v+texel*vec2(-1.0,-1.0)).rgb);
  float tc=luma(texture2D(texGif, v+texel*vec2( 0.0,-1.0)).rgb);
  float tr=luma(texture2D(texGif, v+texel*vec2( 1.0,-1.0)).rgb);
  float ml=luma(texture2D(texGif, v+texel*vec2(-1.0, 0.0)).rgb);
  float mr=luma(texture2D(texGif, v+texel*vec2( 1.0, 0.0)).rgb);
  float bl=luma(texture2D(texGif, v+texel*vec2(-1.0, 1.0)).rgb);
  float bc=luma(texture2D(texGif, v+texel*vec2( 0.0, 1.0)).rgb);
  float br=luma(texture2D(texGif, v+texel*vec2( 1.0, 1.0)).rgb);
  float gx=-tl-2.0*ml-bl+tr+2.0*mr+br, gy=-tl-2.0*tc-tr+bl+2.0*bc+br;
  float edge=clamp(length(vec2(gx,gy))*0.9,0.0,1.0); vec3 edgeCol=vec3(1.0-edge);
  vec3 postEdge=mix(post, post*edgeCol, em);
  float landMask=smoothstep(0.40,0.80,v.y);
  vec3 finalCol=mix(postEdge, src, landMask*0.5);
  gl_FragColor=vec4(finalCol,1.0);
}`;
  const compile=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return sh;};
  const prog=gl.createProgram(); gl.attachShader(prog,compile(gl.VERTEX_SHADER,vs));
  gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(prog); gl.useProgram(prog);
  const quad=new Float32Array([-1,-1,0,1, 1,-1,1,1, -1,1,0,0, 1,1,1,0]);
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,quad,gl.STATIC_DRAW);
  const ap=gl.getAttribLocation(prog,'p'), au=gl.getAttribLocation(prog,'u');
  gl.vertexAttribPointer(ap,2,gl.FLOAT,false,16,0); gl.enableVertexAttribArray(ap);
  gl.vertexAttribPointer(au,2,gl.FLOAT,false,16,8); gl.enableVertexAttribArray(au);
  const texGif=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texGif);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const texBg=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texBg);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texBg);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bgImg);
  gl.uniform1i(gl.getUniformLocation(prog,'texBg'),1);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texGif);
  gl.uniform1i(gl.getUniformLocation(prog,'texGif'),0);
  const uTexel=gl.getUniformLocation(prog,'texel'), uLv=gl.getUniformLocation(prog,'lv');
  const uEm=gl.getUniformLocation(prog,'em'), uTm=gl.getUniformLocation(prog,'tm');
  const uFogC=gl.getUniformLocation(prog,'fogC'); const t0=performance.now();
  let fogCoverage = 0.45;
  function draw(){
    const t=(performance.now()-t0)/1000;
    gl.viewport(0,0,canvas.width,canvas.height); gl.useProgram(prog);
    gl.uniform2f(uTexel,1.0/gifImg.naturalWidth,1.0/gifImg.naturalHeight);
    gl.uniform1f(uLv,levels); gl.uniform1f(uEm,edgeMix); gl.uniform1f(uTm,t);
    gl.uniform1f(uFogC, fogCoverage);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  function loop(){
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texGif);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,gifImg);
    draw(); raf=requestAnimationFrame(loop);
  }
  resize(); window.addEventListener('resize', resize, { passive:true }); loop();
  return {
    cleanup: ()=>{ if(raf) cancelAnimationFrame(raf); window.removeEventListener('resize', resize); },
    setFogCoverage: (v)=>{ fogCoverage = v; gl.useProgram(prog); gl.uniform1f(uFogC, fogCoverage); }
  };
}