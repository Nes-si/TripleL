import React, {Component} from 'react';
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import CSSModules from 'react-css-modules';
import {Helmet} from "react-helmet";

import {showAlert, showModal} from "ducks/nav";
import {update, updateEmail, updatePassword, resendVerEmail, ERROR_USER_EXISTS, ERROR_OTHER} from 'ducks/user';
import {checkEmail} from 'utils/common';
import {checkPassword} from 'utils/data';

import InputControl from 'components/elements/InputControl/InputControl';
import ButtonControl from 'components/elements/ButtonControl/ButtonControl';

import styles from './SettingsView.sss';



const CHG_DATA      = `CHG_DATA`;
const CHG_EMAIL     = `CHG_EMAIL`;
const CHG_PASSWORD  = `CHG_PASSWORD`;


@CSSModules(styles, {allowMultiple: true})
class SettingsView extends Component {
  state = {
    nameFirst: '',
    nameLast: '',
    dirtyData: false,
    errorData: null,
    successData: ``,

    email: '',
    emailNew: '',
    dirtyEmail: false,
    errorEmail: null,
    successEmailState: false,

    passwordOld: ``,
    password: '',
    passwordConfirm: '',
    dirtyPassword: false,
    errorPassword: null,
    successPassword: ``
  };
  userData = null;
  lastChange = null;

  constructor(props) {
    super(props);

    const {user} = props;

    this.userData = user.userData;

    this.state.nameFirst = this.userData.nameFirst;
    this.state.nameLast = this.userData.nameLast;
    this.state.email = this.userData.email;

    if (this.userData.emailNew) {
      this.state.emailNew = this.userData.emailNew;
      this.state.successEmailState = true;
    } else {
      this.state.emailNew = this.userData.email;
    }
  }

  componentWillReceiveProps(nextProps) {
    const {user} = nextProps;

    switch (this.lastChange) {
      case CHG_DATA:
        this.setState({successData: `Данные были успешно именены!`});
        setTimeout(() => this.setState({successData: ``}), 2500);
        break;

      case CHG_EMAIL:
        let errorEmail = null;
        switch (user.error) {
          case ERROR_USER_EXISTS: errorEmail = `Пользователь с таким email'ом уже существует!`; break;
          case ERROR_OTHER:       errorEmail = `Неизвестная ошибка!`;                           break;
        }

        if (errorEmail) {
          this.setState({
            emailNew: this.userData.emailNew ? this.userData.emailNew : this.userData.email,
            errorEmail
          });
        } else {
          this.setState({successEmailState: true});
        }

        break;

      case CHG_PASSWORD:
        this.setState({successPassword: `Пароль был успешно изменён!`});
        setTimeout(() => this.setState({successPassword: ``}), 2500);
        break;
    }
  }

  onSaveData = e => {
    e.preventDefault();

    if (!this.state.dirtyData || this.state.errorData)
      return;

    if (this.validateData()) {
      this.setState({dirtyData: false});
      this.lastChange = CHG_DATA;

      this.userData.nameFirst = this.state.nameFirst;
      this.userData.nameLast = this.state.nameLast;

      const {update} = this.props.userActions;
      update(this.userData);
    }
  };

  onSaveEmail = e => {
    e.preventDefault();

    if (!this.state.dirtyEmail || this.state.errorEmail)
      return;

    if (this.validateEmail()) {
      this.setState({dirtyEmail: false});
      this.lastChange = CHG_EMAIL;

      const {updateEmail} = this.props.userActions;
      updateEmail(this.state.emailNew);
    }
  };

  onSavePassword = e => {
    e.preventDefault();

    if (!this.state.dirtyPassword || this.state.errorPassword)
      return;

    this.validatePassword()
      .then(() => {
        const {updatePassword} = this.props.userActions;
        updatePassword(this.state.password);
        this.lastChange = CHG_PASSWORD;

        this.setState({passwordOld: ``, password: '', passwordConfirm: '', dirtyPassword: false});
      })
      .catch(() => {});
  };

  validateData() {
    return true;
  }

  validateEmail() {
    if (!checkEmail(this.state.emailNew)) {
      this.setState({errorEmail: `Неверный email!`});
      return false;
    }

    return true;
  }

  validatePassword() {
    if (this.state.password != this.state.passwordConfirm) {
      this.setState({errorPassword: `Пароли не совпадают!`});
      return Promise.reject();
    }

    return checkPassword(this.state.passwordOld)
      .catch(e => {
        this.setState({errorPassword: `Текущий пароль неверен!`});
        return Promise.reject();
      });
  }

  onChangeNameFirst = event => {
    const nameFirst = event.target.value;
    this.setState({nameFirst, dirtyData: true, errorData: null});
  };

  onChangeNameLast = event => {
    const nameLast = event.target.value;
    this.setState({nameLast, dirtyData: true, errorData: null});
  };

  onChangeEmail = event => {
    const emailNew = event.target.value;
    this.setState({
      emailNew,
      dirtyEmail: emailNew != this.userData.emailNew,
      errorEmail: null
    });
  };

  onChangePasswordOld = event => {
    const passwordOld = event.target.value;
    const dirtyPassword = !!passwordOld || !!this.state.password || !!this.state.passwordConfirm;
    this.setState({passwordOld, dirtyPassword, errorPassword: null});
  };

  onChangePassword = event => {
    const password = event.target.value;
    const dirtyPassword = !!password || !!this.state.passwordOld || !!this.state.passwordConfirm;
    this.setState({password, dirtyPassword, errorPassword: null});
  };

  onChangePasswordConfirm = event => {
    const passwordConfirm = event.target.value;
    const dirtyPassword = !!passwordConfirm || !!this.state.passwordOld || !!this.state.password;
    this.setState({passwordConfirm, dirtyPassword, errorPassword: null});
  };

  resendVerification = e => {
    const {resendVerEmail} = this.props.userActions;
    resendVerEmail();
  };


  render() {
    return (
      <div styleName="SettingsView">
        <Helmet>
          <title>Настройки — Triple L</title>
        </Helmet>

        <div styleName="background"></div>
        <div styleName="header">
          <div styleName="title">Настройки</div>
        </div>

        <div styleName='content'>
          <form styleName="section" onSubmit={this.onSaveData}>
            <div styleName="section-header">Личные данные</div>
            <div styleName="name-wrapper">
              <div styleName="field">
                <div styleName="field-title">Имя</div>
                <div styleName="input-wrapper">
                  <InputControl type="big"
                                titled
                                value={this.state.nameFirst}
                                onChange={this.onChangeNameFirst} />
                </div>
              </div>
              <div styleName="field">
                <div styleName="field-title">Фамилия</div>
                <div styleName="input-wrapper">
                  <InputControl type="big"
                                titled
                                value={this.state.nameLast}
                                onChange={this.onChangeNameLast} />
                </div>
              </div>
            </div>
            <div styleName="buttons-wrapper">
              <ButtonControl color="purple"
                             type="submit"
                             titled
                             disabled={!this.state.dirtyData || this.state.errorData}
                             value="Обновить личные данные"/>
            </div>
            <div styleName="field-success">
              {this.state.successData}
            </div>
            <div styleName="field-error">
              {this.state.errorData}
            </div>
          </form>

          <form styleName="section" onSubmit={this.onSaveEmail}>
            <div styleName="section-header">Email</div>
            <div styleName="field">
              <div styleName="field-title">Email</div>
              <div styleName="input-wrapper">
                <InputControl type="big"
                              value={this.state.emailNew}
                              titled
                              onChange={this.onChangeEmail} />
              </div>
            </div>
            <div styleName="buttons-wrapper">
              <ButtonControl color="purple"
                             type="submit"
                             disabled={!this.state.dirtyEmail || this.state.errorEmail}
                             value="Изменить email"/>
            </div>
            {this.state.successEmailState &&
              <div styleName="field-success">
                <div>
                  Ваш email был изменён. Мы отправили вам письмо со ссылкой подтверждения. До подтверждения будет использовать ваш старый email <b>{this.state.email}</b>.
                </div>
                <div styleName="field-success-resend" onClick={this.resendVerification}>
                  Отправить подтверждение повторно
                </div>
              </div>
            }
            <div styleName="field-error">
              {this.state.errorEmail}
            </div>
          </form>

          <form styleName="section" onSubmit={this.onSavePassword}>
            <div styleName="section-header">Изменение пароля</div>
            <div styleName="field">
              <div styleName="field-title">Введите текущий пароль</div>
              <div styleName="input-wrapper">
                <InputControl type="big"
                              inputType="password"
                              titled
                              value={this.state.passwordOld}
                              onChange={this.onChangePasswordOld} />
              </div>
            </div>
            <div styleName="field">
              <div styleName="field-title">Введите новый пароль</div>
              <div styleName="input-wrapper">
                <InputControl type="big"
                              inputType="password"
                              titled
                              value={this.state.password}
                              onChange={this.onChangePassword} />
              </div>
            </div>
            <div styleName="field">
              <div styleName="field-title">Введите новый пароль повторно</div>
              <div styleName="input-wrapper">
                <InputControl type="big"
                              inputType="password"
                              titled
                              value={this.state.passwordConfirm}
                              onChange={this.onChangePasswordConfirm} />
              </div>
            </div>
            <div styleName="buttons-wrapper">
              <ButtonControl color="purple"
                             type="submit"
                             disabled={!this.state.dirtyPassword || this.state.errorPassword}
                             value="Изменить пароль"/>
            </div>
            <div styleName="field-success">
              {this.state.successPassword}
            </div>
            <div styleName="field-error">
              {this.state.errorPassword}
            </div>
          </form>
        </div>
      </div>
    );
  }
}


function mapStateToProps(state) {
  return {
    user:         state.user,
    serverStatus: state.serverStatus
  };
}

function mapDispatchToProps(dispatch) {
  return {
    navActions:  bindActionCreators({showModal, showAlert}, dispatch),
    userActions: bindActionCreators({update, updateEmail, updatePassword, resendVerEmail}, dispatch)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SettingsView);