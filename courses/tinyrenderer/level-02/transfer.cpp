#define COURSE_TEST
#include "reference.cpp"

int main() {
    TGAImage image(16, 16, TGAImage::RGB);
    line(5, 12, 2, 3, image, {0, 255, 255, 255});
    return save_preview(image) ? 0 : 1;
}
