#include "tgaimage.h"
#include <algorithm>
#include <cstdlib>
#include <fstream>
void line(int,int,int,int,TGAImage&,TGAColor);
static int cases=0;
static void report(bool passed,const char* category){
  std::ofstream out("judge-result.json");
  out<<"{\"completed\":true,\"passed\":"<<(passed?"true":"false")<<",\"cases\":"<<cases<<",\"category\":\""<<category<<"\"}";
}
static bool check(int ax,int ay,int bx,int by,TGAImage& image,TGAColor color){
  TGAColor expected[16][16];for(int y=0;y<16;y++)for(int x=0;x<16;x++)expected[y][x]=image.get(x,y);
  int n=std::max(std::abs(bx-ax),std::abs(by-ay));
  if(n==0)expected[ay][ax]=color;
  else for(int k=0;k<=n;k++){int x=(2*(ax*(n-k)+bx*k)+n)/(2*n),y=(2*(ay*(n-k)+by*k)+n)/(2*n);expected[y][x]=color;}
  line(ax,ay,bx,by,image,color);cases++;
  for(int y=0;y<16;y++)for(int x=0;x<16;x++)for(int c=0;c<3;c++)if(image.get(x,y)[c]!=expected[y][x][c])return false;
  return true;
}
int main(){
  for(int ax=0;ax<16;ax++)for(int ay=0;ay<16;ay++)for(int bx=0;bx<16;bx++)for(int by=0;by<16;by++){
    TGAImage image(16,16,TGAImage::RGB);image.set(15,15,{7,11,13,255});
    if(!check(ax,ay,bx,by,image,{19,83,211,255})){report(false,"端点、单点或取整规则");return 42;}
  }
  const TGAColor colors[]={{0,0,0,255},{255,0,0,255},{0,0,255,255},{255,255,255,255},{17,91,203,255},{0,255,0,255}};
  for(auto color:colors){
    TGAImage image(16,16,TGAImage::RGB);
    for(int y=0;y<16;y++)for(int x=0;x<16;x++)image.set(x,y,{(uint8_t)(x*11),(uint8_t)(y*13),(uint8_t)((x+y)*7),255});
    if(!check(0,15,15,0,image,color)||!check(1,2,7,15,image,{63,11,219,255})){report(false,"颜色、背景保持或连续绘制");return 42;}
  }
  report(true,"全部函数行为检查");return 0;
}
