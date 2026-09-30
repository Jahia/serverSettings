function validateRegex(element, displayErrors) {
    var regexEmail = RegExp('[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\\.)+[A-Za-z]{2,}');
    var validMail = true;
    var toSplit = $('input[name=' + element + ']').get(0).value.split(',');
    $(toSplit).each(function (index, mail) {
        if (!regexEmail.test(mail)) {
            displayErrors(element);
            validMail = false;
        }
    });
    return validMail;
}

function validateForm(fields, displayErrors) {
    var valid = true;
    if ($('#serviceActivated').prop('checked')) {
        $(fields).each(function (index, formInput) {
            valid = validateRegex(formInput, displayErrors) && valid;
        }
        );
    }

    return valid;
}
