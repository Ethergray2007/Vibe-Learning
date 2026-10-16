#include "output.h"

int main() {
    TGAImage image(16, 16, TGAImage::RGB);
    const TGAColor color = {255, 255, 0, 255};
    image.set(11, 6, color);
    return save_preview(image) ? 0 : 1;
}
