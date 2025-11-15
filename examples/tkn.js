// tkn by pck404
// runs in float mode
mtof=(n)=>440 * 2 ** ((n - 69) / 12),

gate16=(t,seq)=>(
  (seq>>(t&15)&1)
),

rev16=(value, bits = 16) => {
    let rev = 0;
    for (let i = 0; i < bits; ++i) {
        rev = (rev << 1) | (value & 1);
        value >>>= 1;
    }
    return rev & ((1 << bits) - 1);
},

seq16=(t,seq,spd)=>(seq>>((t*spd)&15)&1)*t,

kick = (t) => (
  x = t,
  env = 1 - min(max((x - 0.8) / 0.2, 0), 1),
  env *= 2^x,
  p = x
    -  12 * pow(2, -10 * x)
    -  7 * pow(2, -20 * x)
    -  3 * pow(2, -500 * x),
  w = sin(2 * PI * p),
  sat = tanh(2 * w),
  0.5 * env * sat
),

choir = (t,n,nVoices=6) => (
  base = mtof(n),
  env = max(0.1, min(1.0, (t - 0.2) / 0.3)),

  env*Array(nVoices).fill(0).reduce((s,_,i)=>
    ( det = Math.sin(i*12.9898)*0.02,
      freq = base * 2**det,
      ph = t*freq,
      s + sin(6.28*(ph + 0.3*sin(6.28*ph*3)))
    )
  ,0)/nVoices
),

bass = (t,n) => (
  fq = mtof(n),
  env = min(max((t - 0.2) / 0.3, 0.1), 0.4),
  flt=16+10*sin(t-PI),
  tanh(sin(fq*t*TAU)*flt)*env
),

hh = () => (
  spd=(t)%8>7.5?12:8,
  env=1-(t*spd)%1,
  random()**8*env**4
),

ride = (t) => (
  env = max(0.2, min(1.0, (t - 0.1) / 0.5)),
  random()*0.5*env
),

T=t%0.5,
kick(T)*0.5
+bass(seq16(t,rev16(0b0011_0110_1101_1011),8),29+(7*((t/8)%2<1)))*0.5
+choir(T,60,30)*0.3
+hh()*0.2
+ride(T)*0.3
