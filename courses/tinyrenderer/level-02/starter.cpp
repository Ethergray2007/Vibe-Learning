#include "output.h"
#include <algorithm>
#include <cmath>

void line(int ax, int ay, int bx, int by, TGAImage &image, TGAColor color) {
    // EDIT BEGIN: currently draws only the endpoints
    image.set(ax, ay, color);
    image.set(bx, by, color);
    // EDIT END
}

#ifndef COURSE_TEST
int main() {
    TGAImage image(16, 16, TGAImage::RGB);
    line(2, 3, 10, 7, image, {0, 255, 0, 255});
    return save_preview(image) ? 0 : 1;
}
#endif
