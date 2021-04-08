function stringShortener(input) {
    if (input.length > 110) {
        return input.substr(0,75) + "..." + input.substr(-29);
    } else {
        return input;
    }
}
