#include "output.h"
#include <algorithm>
#include <cmath>

void line(int ax, int ay, int bx, int by, TGAImage &image, TGAColor color) {
    const int dx = bx - ax;
    const int dy = by - ay;
    const int steps = std::max(std::abs(dx), std::abs(dy));
    if (steps == 0) {
        image.set(ax, ay, color);
        return;
    }
    for (int i = 0; i <= steps; ++i) {
        const double t = double(i) / steps;
        const int x = int(std::round(ax + dx * t));
        const int y = int(std::round(ay + dy * t));
        image.set(x, y, color);
    }
}

#ifndef COURSE_TEST
int main() {
    TGAImage image(16, 16, TGAImage::RGB);
    line(2, 3, 10, 7, image, {0, 255, 0, 255});
    return save_preview(image) ? 0 : 1;
}
#endif
