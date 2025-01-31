import React, {Component} from 'react';
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import CSSModules from 'react-css-modules';
import {NavLink, withRouter} from "react-router-dom";
import InlineSVG from 'svg-inline-react';

import {showModal, MODAL_TYPE_SIGN, MODAL_TYPE_SETTLEMENT} from "ducks/nav";
import {logout, updateLocation} from "ducks/user";

import {MODE_LOGIN, MODE_REG} from "components/modals/SignModal/SignModal";

import styles from './Header.sss';

import ImageLogo from 'assets/images/logo3.svg';


@CSSModules(styles, {allowMultiple: true})
class Header extends Component {
  onLogin = () => {
    const {showModal} = this.props.navActions;
    showModal(MODAL_TYPE_SIGN, {mode: MODE_LOGIN});
  };

  onReg = () => {
    const {showModal} = this.props.navActions;
    showModal(MODAL_TYPE_SIGN, {mode: MODE_REG});
  };

  onLogout = () => {
    this.props.userActions.logout();
  };

  onLocationClick = () => {
    const {showModal} = this.props.navActions;
    showModal(MODAL_TYPE_SETTLEMENT, {callback: loc =>
      this.props.userActions.updateLocation(loc)
    });
  };

  render() {
    const {authorized, loc} = this.props.user;

    let menu = (
      <div styleName="menu">
        <div styleName="item" onClick={this.onLogin}>Вход</div>
        <div styleName="item" onClick={this.onReg}>Регистрация</div>
      </div>
    );

    if (authorized)
      menu = (
        <div styleName="menu">
          <NavLink styleName="item"
                   activeClassName={styles.itemActive}
                   to="/dashboard">
            Домой
          </NavLink>
          <NavLink styleName="item"
                   activeClassName={styles.itemActive}
                   to="/events-list">
            Найти события
          </NavLink>
          <NavLink styleName="item"
                   activeClassName={styles.itemActive}
                   to="/settings">
            Настройки
          </NavLink>
          <div styleName="item" onClick={this.onLogout}>Выход</div>
        </div>
      );

    return (
      <div styleName="Header">
        <NavLink styleName="logo-link"
                 to="/">
          <InlineSVG styleName="logo" src={ImageLogo} />
        </NavLink>
        {//<div styleName="logo">
          //<img src={ImageLogo}/>
        //</div>
        }
        {menu}
        {!authorized && !!loc &&
          <div styleName="location" onClick={this.onLocationClick}>
            Ваш населённый пункт — {loc.main}, верно?
          </div>
        }
      </div>
    );
  }
}


function mapStateToProps(state) {
  return {
    nav:  state.nav,
    user: state.user
  };
}

function mapDispatchToProps(dispatch) {
  return {
    navActions:   bindActionCreators({showModal}, dispatch),
    userActions:  bindActionCreators({logout, updateLocation}, dispatch)
  };
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Header));
