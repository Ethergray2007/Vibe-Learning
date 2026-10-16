#define COURSE_TEST
#include "candidate.inc"
#include <iostream>

int main() {
    const TGAColor color = {19, 83, 211, 255};
    for (int ax=0; ax<16; ++ax) for (int ay=0; ay<16; ++ay)
    for (int bx=0; bx<16; ++bx) for (int by=0; by<16; ++by) {
        TGAImage image(16,16,TGAImage::RGB);
        image.set(15,15,{7,11,13,255});
        bool expected[16][16] = {};
        const int n=std::max(std::abs(bx-ax),std::abs(by-ay));
        if (!n) expected[ay][ax]=true;
        else for (int k=0;k<=n;++k) {
            // Exact rational rounding of nonnegative coordinates, independent of float DDA.
            const int x=(2*(ax*(n-k)+bx*k)+n)/(2*n);
            const int y=(2*(ay*(n-k)+by*k)+n)/(2*n);
            expected[y][x]=true;
        }
        line(ax,ay,bx,by,image,color);
        for(int y=0;y<16;++y) for(int x=0;x<16;++x) {
            auto got=image.get(x,y);
            const TGAColor want=expected[y][x] ? color :
                ((x==15 && y==15) ? TGAColor{7,11,13,255} : TGAColor{});
            for(int c=0;c<3;++c) if(got[c]!=want.bgra[c]) {
                std::cerr << "mismatch endpoints " << ax << ',' << ay << " -> " << bx << ',' << by
                          << " pixel " << x << ',' << y << '\n';
                return 1;
            }
        }
    }
    std::cout << "PASS 65536 endpoint pairs; exact pixels, supplied color, preserved background\n";
}
