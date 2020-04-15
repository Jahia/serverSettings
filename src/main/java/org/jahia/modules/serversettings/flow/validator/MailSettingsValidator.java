/*
 * ==========================================================================================
 * =                   JAHIA'S DUAL LICENSING - IMPORTANT INFORMATION                       =
 * ==========================================================================================
 *
 *                                 http://www.jahia.com
 *
 *     Copyright (C) 2002-2020 Jahia Solutions Group SA. All rights reserved.
 *
 *     THIS FILE IS AVAILABLE UNDER TWO DIFFERENT LICENSES:
 *     1/GPL OR 2/JSEL
 *
 *     1/ GPL
 *     ==================================================================================
 *
 *     IF YOU DECIDE TO CHOOSE THE GPL LICENSE, YOU MUST COMPLY WITH THE FOLLOWING TERMS:
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 *
 *     2/ JSEL - Commercial and Supported Versions of the program
 *     ===================================================================================
 *
 *     IF YOU DECIDE TO CHOOSE THE JSEL LICENSE, YOU MUST COMPLY WITH THE FOLLOWING TERMS:
 *
 *     Alternatively, commercial and supported versions of the program - also known as
 *     Enterprise Distributions - must be used in accordance with the terms and conditions
 *     contained in a separate written agreement between you and Jahia Solutions Group SA.
 *
 *     If you are unsure which license is appropriate for your use,
 *     please contact the sales department at sales@jahia.com.
 */
package org.jahia.modules.serversettings.flow.validator;

import java.io.Serializable;

import org.apache.log4j.Logger;
import org.jahia.services.mail.MailService;
import org.jahia.services.mail.MailSettings;
import org.springframework.binding.message.MessageBuilder;
import org.springframework.binding.validation.ValidationContext;

/**
 * @author rincevent
 */
public class MailSettingsValidator implements Serializable {
    private static final long serialVersionUID = -8286051616441316996L;
    private transient static Logger logger = Logger.getLogger(MailSettingsValidator.class);

    public void validateShowMailSettings(MailSettings mailSettings, ValidationContext validationContext) {
        logger.info("Validating mail settings");
        if (mailSettings.isServiceActivated()) {
            if (mailSettings.getFrom() == null || mailSettings.getFrom().isEmpty()) {
                validationContext.getMessageContext().addMessage(
                        new MessageBuilder().error().source("from")
                                .code("serverSettings.mailServerSettings.errors.from.mandatory").build());
            } else if (!MailService.isValidEmailAddress(mailSettings.getFrom(), false)) {
                validationContext.getMessageContext().addMessage(
                        new MessageBuilder().error().source("from")
                                .code("serverSettings.mailServerSettings.errors.email.from").build());
            }
            if (mailSettings.getTo() == null || mailSettings.getTo().isEmpty()) {
                validationContext.getMessageContext().addMessage(
                        new MessageBuilder().error().source("to")
                                .code("serverSettings.mailServerSettings.errors.administrator.mandatory").build());
            } else if (!MailService.isValidEmailAddress(mailSettings.getTo(), true)) {
                validationContext.getMessageContext().addMessage(
                        new MessageBuilder().error().source("to")
                                .code("serverSettings.mailServerSettings.errors.email.to").build());
            }
            if (mailSettings.getUri() == null || mailSettings.getUri().isEmpty()) {
                validationContext.getMessageContext().addMessage(
                        new MessageBuilder().error().source("uri")
                                .code("serverSettings.mailServerSettings.errors.server.mandatory").build());
            }

        } else {
            validationContext.getMessageContext().clearMessages();
        }
    }
}
